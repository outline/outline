import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldRenderer } from "./field-renderer";
import type { TFieldSchema } from "./types";

const imageField: TFieldSchema = {
	fieldname: "photoUrl",
	fieldtype: "image",
	label: "Photo",
};

describe("FieldRenderer — image field onChange wiring", () => {
	it("calls onChange with (fieldname, file) when a file is selected", () => {
		const handleChange = vi.fn();
		const { container } = render(
			<FieldRenderer
				field={imageField}
				value={null}
				values={{}}
				onChange={handleChange}
			/>,
		);

		const file = new File(["binary"], "pet.jpg", { type: "image/jpeg" });
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement;

		fireEvent.change(input, { target: { files: [file] } });

		expect(handleChange).toHaveBeenCalledWith("photoUrl", file);
	});

	it("calls onChange with (fieldname, null) when the remove button is clicked", () => {
		const handleChange = vi.fn();
		const file = new File(["binary"], "pet.jpg", { type: "image/jpeg" });
		const { getByRole } = render(
			<FieldRenderer
				field={imageField}
				value={file}
				values={{}}
				onChange={handleChange}
			/>,
		);

		fireEvent.click(getByRole("button"));

		expect(handleChange).toHaveBeenCalledWith("photoUrl", null);
	});
});
