import { createContext, useContext } from "react";
import type { Editor } from "../";

const EditorContext = createContext<Editor>({} as Editor);

export const useEditor = () => useContext(EditorContext);

export default EditorContext;
