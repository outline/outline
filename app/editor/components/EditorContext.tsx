import { createContext, useContext } from "react";
import { Editor } from "../";

const EditorContext = createContext<Editor>({} as Editor);

export const useEditor = () => useContext(EditorContext);

export default EditorContext;
