import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { SchemaForm } from "~/components/SchemaForm";
import { ProductDocType } from "~/utils/doctypes";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { StatusChip } from "~/components/StatusChip";
import {
  Card,
  TBody,
  THead,
  Table,
  Td,
  TdMono,
  Th,
} from "~/components/Surface";
import { formatCurrency } from "~/utils/format";

/**
 * Product catalogue with stock levels, flagging anything at or below its
 * reorder level.
 *
 * @returns the rendered products page.
 */
function Products() {
  const { t } = useTranslation();
  const products = useShop((state) => state.products);
  const adjustStock = useShop((state) => state.adjustStock);
  const saveProduct = useShop((state) => state.saveProduct);
  const deleteProduct = useShop((state) => state.deleteProduct);

  const [editing, setEditing] = useState<string | undefined>();
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();

  const handleSave = async (values: Record<string, string>, id?: string) => {
    setNotice(undefined);
    const result = await saveProduct({
      id,
      name: values.name ?? "",
      sku: values.sku ?? "",
      category: values.category ?? "Food",
      price: Number(values.price) || 0,
      reorderLevel: Number(values.reorderLevel) || 0,
    });

    if (result?.saved) {
      setEditing(undefined);
      setIsAdding(false);
      return;
    }
    setNotice(
      result?.reason === "duplicate_sku"
        ? t("Another product already uses that code.")
        : t("A product needs a name and a code.")
    );
  };

  const handleDelete = async (id: string, name: string) => {
    setNotice(undefined);
    const result = await deleteProduct(id);
    if (!result?.removed) {
      setNotice(
        t("{{name}} has been sold or ordered, so it was archived instead.", {
          name,
        })
      );
    }
  };

  return (
    <AppPage
      title="Products"
      description="Catalogue, pricing and stock on hand."
      actions={
        <Button onClick={() => setIsAdding(true)}>{t("New product")}</Button>
      }
    >
      {notice ? (
        <Text as="p" type="secondary" data-testid="products-notice">
          {notice}
        </Text>
      ) : null}

      {isAdding ? (
        <>
          <Subheading>{t("New product")}</Subheading>
          <SchemaForm
            doctype={ProductDocType}
            submitLabel="Add product"
            onSubmit={(values) => void handleSave(values)}
            onCancel={() => setIsAdding(false)}
          />
        </>
      ) : null}

      {editing ? (
        <>
          <Subheading>{t("Edit product")}</Subheading>
          <SchemaForm
            doctype={ProductDocType}
            initial={(() => {
              const product = products.find((item) => item.id === editing);
              return {
                name: product?.name ?? "",
                sku: product?.sku ?? "",
                category: product?.category ?? "Food",
                price: String(product?.price ?? ""),
                reorderLevel: String(product?.reorderLevel ?? ""),
              };
            })()}
            submitLabel="Save product"
            onSubmit={(values) => void handleSave(values, editing)}
            onCancel={() => setEditing(undefined)}
          />
        </>
      ) : null}

      <Card>
        <Table>
          <THead>
            <tr>
              {[
                "SKU",
                "Product",
                "Category",
                "Price",
                "Stock",
                "Status",
                "",
              ].map((heading) => (
                <Th key={heading} scope="col">
                  {heading}
                </Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {products.map((product) => {
              const low = product.stock <= product.reorderLevel;

              return (
                <tr key={product.id}>
                  <TdMono>
                    {product.sku}
                    {product.variants ? (
                      <Text
                        as="span"
                        size="xsmall"
                        type="tertiary"
                        style={{ display: "block", textTransform: "uppercase" }}
                      >
                        {t("{{ count }} sizes", {
                          count: product.variants.length,
                        })}
                      </Text>
                    ) : null}
                  </TdMono>
                  <Td>
                    {product.name}
                    <Text
                      as="span"
                      size="xsmall"
                      type="tertiary"
                      style={{ display: "block" }}
                    >
                      {product.supplier}
                    </Text>
                    {product.variants?.map((variant) => (
                      <Text
                        key={variant.id}
                        as="span"
                        size="xsmall"
                        type="secondary"
                        style={{ display: "block", marginTop: 4 }}
                      >
                        {variant.name} · {variant.sku} ·{" "}
                        {formatCurrency(variant.price)} ·{" "}
                        <Text
                          as="span"
                          size="xsmall"
                          weight={
                            variant.stock <= product.reorderLevel
                              ? "bold"
                              : "normal"
                          }
                          type={
                            variant.stock <= product.reorderLevel
                              ? "danger"
                              : "secondary"
                          }
                        >
                          {variant.stock} {t("in stock")}
                        </Text>
                      </Text>
                    ))}
                  </Td>
                  <Td>{product.category}</Td>
                  <Td>{formatCurrency(product.price)}</Td>
                  <Td>
                    <Text weight="bold" type={low ? "danger" : undefined}>
                      {product.stock}
                    </Text>
                    {low ? (
                      <Text
                        as="span"
                        size="xsmall"
                        type="danger"
                        style={{ display: "block" }}
                      >
                        reorder at {product.reorderLevel}
                      </Text>
                    ) : null}
                  </Td>
                  <Td>
                    <StatusChip status={product.status} />
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <Flex align="center" gap={8} justify="flex-end">
                      <Button
                        neutral
                        borderOnHover
                        onClick={() => setEditing(product.id)}
                      >
                        {t("Edit")}
                      </Button>
                      <Button
                        neutral
                        borderOnHover
                        onClick={() =>
                          void handleDelete(product.id, product.name)
                        }
                      >
                        {t("Remove")}
                      </Button>
                      <Flex align="center" gap={4}>
                        <Button
                          neutral
                          aria-label={`Decrease stock of ${product.name}`}
                          onClick={() => void adjustStock(product.id, -1)}
                        >
                          −
                        </Button>
                        <Button
                          neutral
                          aria-label={`Increase stock of ${product.name}`}
                          onClick={() => void adjustStock(product.id, 1)}
                        >
                          +
                        </Button>
                      </Flex>
                    </Flex>
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
        {products.length === 0 ? (
          <Empty style={{ padding: "24px 16px" }}>No products yet.</Empty>
        ) : null}
      </Card>
    </AppPage>
  );
}

export default Products;
