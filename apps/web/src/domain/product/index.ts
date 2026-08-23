// Components
export type { TProductFormProps } from "./components/ProductForm/ProductForm";
export { ProductForm } from "./components/ProductForm/ProductForm";
export type { TProductListProps } from "./components/ProductList/ProductList";
export { ProductList } from "./components/ProductList/ProductList";
export type { TProductTableProps } from "./components/ProductTable/ProductTable";
export { ProductTable } from "./components/ProductTable/ProductTable";

// DTO
export type { TProductDto, TProductVariantDto } from "./product.dto";
export {
	getDefaultVariant,
	toProductDto,
	toProductVariantDto,
} from "./product.dto";

// Errors
export * from "./product.errors";

// Module
export { ProductModule } from "./product.module";

// Programs
export {
	addProductProgram,
	addVariantProgram,
	deleteProductProgram,
	deleteVariantProgram,
	getFeaturedProductsProgram,
	getLowStockProgram,
	getProductProgram,
	getProductsProgram,
	importProductsProgram,
	toggleFeaturedProductProgram,
	updateProductProgram,
	updateVariantProgram,
} from "./product.programs";

// Repository Interface
export { IProductRepository } from "./product.repository";

// Schemas & Commands
export type {
	CreateProductCommand,
	CreateVariantCommand,
	UpdateProductCommand,
	UpdateVariantCommand,
} from "./product.schemas";
export {
	CreateProductSchema,
	CreateVariantSchema,
	UpdateProductSchema,
	UpdateVariantSchema,
} from "./product.schemas";

// Types
export type {
	TProduct,
	TProductId,
	TProductProps,
	TProductUnit,
	TProductVariant,
	TProductVariantId,
	TProductVariantProps,
	TProductWithVariants,
} from "./product.types";
export { PRODUCT_UNITS } from "./product.types";
