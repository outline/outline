import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import Document from "~/models/Document";
import { client } from "~/utils/ApiClient";
import type { PaginationParams } from "~/types";

/**
 * Displays hashtags with optional popularity sorting and tagged documents.
 *
 * @returns The hashtags scene.
 */
const Hashtags = () => {
    const { t } = useTranslation();
    const { documents } = useStores();
    const [hashtags, setHashtags] = React.useState<string[]>([]);
    const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
    const [counts, setCounts] = React.useState<Record<string, number>>({});
    const [sort, setSort] = React.useState<"alpha" | "count">("count");

    React.useEffect(() => {
        async function loadHashtags() {
            try {
                const res = await client.post("/hashtags.list", { sort });
                setHashtags(res.data);
                setCounts(res.counts ?? {});
            } catch (err) {
                console.error("Failed to load hashtags", err);
            }
        }
        void loadHashtags();
    }, [sort]);

    React.useEffect(() => {
        if (!selectedTag && hashtags.length > 0) {
            setSelectedTag(hashtags[0]);
        }
    }, [hashtags, selectedTag]);

    const requestFn = React.useCallback(
        async (options: PaginationParams = {}): Promise<Document[]> => {
            if (!selectedTag) {
                return [];
            }

            const res = await client.post<{ data: Document[] }>("/hashtags.documents", {
                tag: selectedTag,
                ...options,
            });
            return res.data.map((doc: Document) => documents.add(doc));
        },
        [selectedTag, documents]
    );

    const { data: taggedDocuments } = usePaginatedRequest<Document>(requestFn);

    return (
        <Scene
            title={t("Hashtags")}
            icon={<HashtagIcon color="currentColor" />}
        >
            <Heading as="h1">{t("Hashtags")}</Heading>
            <Filters align="center" gap={8}>
                <InputSelect
                    label={t("Sort")}
                    hideLabel
                    options={[
                        { type: "item", label: t("Most popular"), value: "count" },
                        { type: "item", label: t("A–Z"), value: "alpha" },
                    ]}
                    value={sort}
                    onChange={(value) =>
                        setSort(value === "alpha" ? "alpha" : "count")
                    }
                    short
                />
            </Filters>
            <Flex wrap gap={8}>
                {hashtags.length === 0 && (
                    <EmptyState>{t("No hashtags found yet")}</EmptyState>
                )}
                {hashtags.map((tag) => (
                    <TagButton
                        key={tag}
                        active={selectedTag === tag}
                        onClick={() => setSelectedTag(tag)}
                    >
                        <span>#{tag}</span>
                        {counts[tag] ? (
                            <TagCount>{counts[tag]}</TagCount>
                        ) : null}
                    </TagButton>
                ))}
            </Flex>

            {selectedTag && (
                <ResultsSection>
                    <Heading as="h2">{t("Documents with #{{tag}}", { tag: selectedTag })}</Heading>
                    <PaginatedDocumentList
                        key={selectedTag}
                        documents={taggedDocuments ?? []}
                        fetch={requestFn}
                        showCollection
                    />
                </ResultsSection>
            )}
        </Scene>
    );
};

const TagButton = styled.button<{ active?: boolean }>`
  background: ${(props) => (props.active ? s("accent") : s("backgroundSecondary"))};
  color: ${(props) => (props.active ? s("accentText") : s("text"))};
  border: 1px solid ${s("divider")};
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 100ms ease-in-out;
  display: inline-flex;
  gap: 6px;
  align-items: center;

  &:hover {
    background: ${(props) =>
        props.active ? s("accent") : s("backgroundSecondary")};
    opacity: 0.8;
  }
`;

const ResultsSection = styled.div`
  margin-top: 32px;
`;

const Filters = styled(Flex)`
  margin: 8px 0 16px;
`;

const TagCount = styled.span`
  color: ${s("textSecondary")};
  font-size: 12px;
`;

const EmptyState = styled.p`
  margin: 16px 0;
  color: ${s("textSecondary")};
`;

const HashtagIcon = ({ color }: { color: string }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M10 3L8.66667 21M15.3333 3L14 21M21 9H4M20 15H3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default observer(Hashtags);
