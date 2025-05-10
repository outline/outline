import "./bootstrap";
import fractionalIndex from "fractional-index";
import { Sequelize, Transaction } from "sequelize";
import { Collection, Team } from "@server/models";
import { sequelize } from "@server/storage/database";

const limit = 100;

class CollectionIndexCollisionResolver {
  private teamId: string;
  private currDuplicateIndex: string | null = null;
  private currDuplicateGroup: Collection[] = [];
  private resolvedCollisionsCount: number = 0;

  constructor(teamId: string) {
    this.teamId = teamId;
  }

  public async process() {
    await sequelize.transaction(async (transaction) => {
      await this.processPage(0, transaction);
      // edge case of last batch
      await this.resolveDuplicates({ transaction });
    });
  }

  private async processPage(
    page: number,
    transaction: Transaction
  ): Promise<void> {
    console.log(
      `Resolve collection index collisions for team ${this.teamId}… page ${page}`
    );

    const collections = await Collection.unscoped().findAll({
      where: { teamId: this.teamId },
      attributes: ["id", "index"],
      limit,
      offset: page * limit,
      order: [
        Sequelize.literal('"collection"."index" collate "C"'), // ensure duplicates are in sequential order
        ["updatedAt", "DESC"], // fallback as a tie breaker
      ],
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    if (!collections.length) {
      return;
    }

    let idx = 0;

    while (idx < collections.length) {
      const collection = collections[idx];

      if (collection.index === this.currDuplicateIndex) {
        // still in the same duplicate group.
        this.currDuplicateGroup.push(collection);
      } else {
        // current collection index is different from the previous one; resolve duplicates, if applicable.
        await this.resolveDuplicates({
          nextCollection: collection,
          transaction,
        });
        // reset the duplicate index and group.
        this.currDuplicateIndex = collection.index;
        this.currDuplicateGroup = [collection];
      }

      idx++;
    }

    return collections.length === limit
      ? this.processPage(page + 1, transaction)
      : undefined;
  }

  private async resolveDuplicates({
    nextCollection,
    transaction,
  }: {
    nextCollection?: Collection;
    transaction: Transaction;
  }) {
    if (this.currDuplicateGroup.length <= 1) {
      // no action needed when there aren't more than 1 item in a group.
      return;
    }

    let prevIndex = this.currDuplicateGroup[0].index;
    const endIndex = nextCollection?.index ?? null;

    // First collection in a duplicate group can retain its index.
    for (let idx = 1; idx < this.currDuplicateGroup.length; idx++) {
      const collection = this.currDuplicateGroup[idx];
      const newIndex = fractionalIndex(prevIndex, endIndex);

      console.log(`New index for collection ${collection.id} = ${newIndex}`);

      collection.index = newIndex;
      await collection.save({ silent: true, hooks: false, transaction });

      prevIndex = newIndex;
    }

    this.resolvedCollisionsCount += this.currDuplicateGroup.length - 1;
  }
}

export default async function main(exit = false) {
  await Team.findAllInBatches<Team>({ batchLimit: 5 }, async (teams) => {
    for (const team of teams) {
      const resolver = new CollectionIndexCollisionResolver(team.id);
      await resolver.process();
    }
  });

  if (exit) {
    process.exit(0);
  }
}

// In the test suite we import the script rather than run via node CLI
if (process.env.NODE_ENV !== "test") {
  void main(true);
}
