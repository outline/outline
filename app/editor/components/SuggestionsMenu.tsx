import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import commandScore from "command-score";
import capitalize from "lodash/capitalize";
import orderBy from "lodash/orderBy";
import { TextSelection } from "prosemirror-state";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { keyframes } from "styled-components";
import insertFiles from "@shared/editor/commands/insertFiles";
import { EmbedDescriptor } from "@shared/editor/embeds";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import type { MenuItem } from "@shared/editor/types";
import { s } from "@shared/styles";
import { getEventFiles } from "@shared/utils/files";
import { AttachmentValidation } from "@shared/validations";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "~/components/primitives/Drawer";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/primitives/Popover";
import { MouseSafeArea } from "~/components/MouseSafeArea";
import Scrollable from "~/components/Scrollable";
import useDictionary from "~/hooks/useDictionary";
import useMobile from "~/hooks/useMobile";
import Logger from "~/utils/Logger";
import { useEditor } from "./EditorContext";
import Input from "./Input";
import { MenuHeader } from "~/components/primitives/components/Menu";

export type Props<T extends MenuItem = MenuItem> = {
  rtl: boolean;
  isActive: boolean;
  search: string;
  trigger: string;
  uploadFile?: (file: File) => Promise<string>;
  onFileUploadStart?: () => void;
  onFileUploadStop?: () => void;
  onFileUploadProgress?: (id: string, fractionComplete: number) => void;
  /** Callback when the menu is closed */
  onClose: (insertNewLine?: boolean) => void;
  /** Optional callback when a suggestion is selected */
  onSelect?: (item: MenuItem) => void;
  embeds?: EmbedDescriptor[];
  renderMenuItem: (
    item: T,
    index: number,
    options: {
      selected: boolean;
      disclosure?: boolean;
      onClick: (event: React.SyntheticEvent) => void;
    }
  ) => React.ReactNode;
  filterable?: boolean;
  items: T[];
};

function SuggestionsMenu<T extends MenuItem>(props: Props<T>) {
  const { view, commands, props: editorProps } = useEditor();
  const dictionary = useDictionary();
  const { t } = useTranslation();
  const isMobile = useMobile();
  const pointerRef = React.useRef<{ clientX: number; clientY: number }>({
    clientX: 0,
    clientY: 0,
  });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectionRef = React.useRef<{ from: number; to: number } | null>(null);
  const [insertItem, setInsertItem] = React.useState<
    MenuItem | EmbedDescriptor
  >();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [submenu, setSubmenu] = React.useState<{
    index: number;
    items: MenuItem[];
    selectedIndex: number;
  } | null>(null);
  const itemRefs = React.useRef<Map<number, HTMLElement>>(new Map());
  const submenuContentRef = React.useRef<HTMLDivElement>(null);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Stores the caret bounding rect, snapshotted when the menu opens
  const caretRectRef = React.useRef(new DOMRect());

  // Stable virtual element for Radix PopoverAnchor – never replaced so the
  // popper does not trigger unnecessary anchor-change cycles.
  const caretRef = React.useRef({
    getBoundingClientRect: () => caretRectRef.current,
  });

  // Compute and store the caret rect during render so it is available before
  // the Radix popper effect runs for the first time.
  const caretRect = React.useMemo(() => {
    if (!props.isActive) {
      return new DOMRect();
    }

    try {
      const { selection } = view.state;
      const fromPos = view.coordsAtPos(selection.from);
      const toPos = view.coordsAtPos(selection.to, -1);
      const top = Math.min(fromPos.top, toPos.top);
      const bottom = Math.max(fromPos.bottom, toPos.bottom);
      const left = Math.min(fromPos.left, toPos.left);
      const right = Math.max(fromPos.right, toPos.right);
      return new DOMRect(left, top, right - left, bottom - top);
    } catch (err) {
      Logger.warn("Unable to calculate caret position", err);
      return new DOMRect();
    }
  }, [props.isActive, view]);

  caretRectRef.current = caretRect;

  const resolveChildren = (
    children: MenuItem["children"]
  ): MenuItem[] | undefined =>
    typeof children === "function" ? children() : children;

  React.useEffect(() => {
    if (props.isActive) {
      // Save the selection position when the menu opens and as the user types.
      // On mobile, the editor may lose focus/selection when tapping on menu
      // items, so we restore it. The position must stay current as the search
      // text grows, otherwise the deletion range calculated in handleClearSearch
      // will be wrong.
      requestAnimationFrame(() => {
        const { from, to } = view.state.selection;
        selectionRef.current = { from, to };
      });
    } else {
      selectionRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isActive, props.search]);

  React.useEffect(() => {
    setSubmenu(null);

    if (!props.isActive) {
      return;
    }

    setSelectedIndex(0);
    setInsertItem(undefined);
  }, [props.isActive]);

  React.useEffect(() => {
    setSelectedIndex(0);
    setSubmenu(null);
  }, [props.search]);

  const handleClearSearch = React.useCallback(() => {
    const { state, dispatch } = view;
    const selection =
      isMobile && selectionRef.current ? selectionRef.current : state.selection;
    const poss = state.doc.cut(
      selection.from - (props.search ?? "").length - props.trigger.length,
      selection.from
    );
    const trimTrigger = poss.textContent.startsWith(props.trigger);

    if (!props.search && !trimTrigger) {
      return;
    }

    // clear search input
    dispatch(
      state.tr.insertText(
        "",
        Math.max(
          0,
          selection.from -
            (props.search ?? "").length -
            (trimTrigger ? props.trigger.length : 0)
        ),
        selection.to
      )
    );
  }, [props.search, props.trigger, view]);

  const restoreSelection = React.useCallback(() => {
    if (!isMobile) {
      return;
    }

    // Restore the saved selection position. On mobile, the editor selection may be
    // lost when the drawer opens or when tapping on menu items.
    if (selectionRef.current) {
      const { from, to } = selectionRef.current;
      const { tr, doc } = view.state;
      const selection = TextSelection.create(doc, from, to);
      view.dispatch(tr.setSelection(selection));

      // Re-focus the editor post-click
      requestAnimationFrame(() => view.focus());
    }
  }, [isMobile, view]);

  const insertNode = React.useCallback(
    (item: MenuItem | EmbedDescriptor) => {
      restoreSelection();
      handleClearSearch();

      const command = item.name ? commands[item.name] : undefined;
      const attrs =
        typeof item.attrs === "function" ? item.attrs(view.state) : item.attrs;

      if (item.name === "noop") {
        if ("onClick" in item) {
          item.onClick?.();
        }
      } else if (command) {
        command(attrs);
      } else {
        commands[`create${capitalize(item.name)}`](attrs);
      }
      if ("appendSpace" in item) {
        const { dispatch } = view;
        dispatch(view.state.tr.insertText(" "));
      }

      props.onClose();
    },
    [commands, handleClearSearch, props, restoreSelection, view]
  );

  const handleClickItem = React.useCallback(
    (item) => {
      if (item.disabled) {
        return;
      }

      props.onSelect?.(item);

      switch (item.name) {
        case "link":
          insertNode({
            ...item,
            name: "mention",
          });
          void editorProps.onCreateLink?.({
            title: item.attrs.label,
            id: item.attrs.modelId,
          });
          return;
        case "image":
          return triggerFilePick(
            AttachmentValidation.imageContentTypes.join(", "),
            item.attrs
          );
        case "video":
          return triggerFilePick("video/*", item.attrs);
        case "attachment":
          return triggerFilePick(item.attrs?.accept ?? "*", item.attrs);
        case "embed":
          return triggerLinkInput(item);
        default:
          insertNode(item);
      }
    },
    [editorProps, props, insertNode]
  );

  const close = React.useCallback(() => {
    props.onClose();
    view.focus();
  }, [props, view]);

  const handleLinkInputKeydown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (!props.isActive) {
      return;
    }
    if (!insertItem) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      const href = event.currentTarget.value;
      const matches = "matcher" in insertItem && insertItem.matcher(href);

      if (!matches) {
        toast.error(dictionary.embedInvalidLink);
        return;
      }

      insertNode({
        name: "embed",
        attrs: {
          href,
        },
      });
    }

    if (event.key === "Escape") {
      props.onClose();
      view.focus();
    }
  };

  const handleLinkInputPaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    if (!props.isActive) {
      return;
    }
    if (!insertItem) {
      return;
    }

    const href = event.clipboardData.getData("text/plain");
    const matches = "matcher" in insertItem && insertItem.matcher(href);

    if (matches) {
      event.preventDefault();
      event.stopPropagation();

      insertNode({
        name: "embed",
        attrs: {
          href,
        },
      });
    }
  };

  const triggerFilePick = (accept: string, attrs?: Record<string, any>) => {
    if (inputRef.current) {
      if (accept) {
        inputRef.current.accept = accept;
      }
      if (attrs) {
        inputRef.current.dataset.attrs = attrs ? JSON.stringify(attrs) : "";
      }
      inputRef.current.click();
    }
  };

  const triggerLinkInput = (item: MenuItem) => {
    setInsertItem(item);
  };

  const handleFilesPicked = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    restoreSelection();

    const {
      uploadFile,
      onFileUploadStart,
      onFileUploadStop,
      onFileUploadProgress,
    } = props;
    const files = getEventFiles(event);
    const parent = findParentNode((node) => !!node)(view.state.selection);
    const attrs = event.currentTarget.dataset.attrs
      ? JSON.parse(event.currentTarget.dataset.attrs)
      : undefined;

    handleClearSearch();

    if (!uploadFile) {
      throw new Error("uploadFile prop is required to replace files");
    }

    if (parent) {
      await insertFiles(view, event, parent.pos, files, {
        uploadFile,
        onFileUploadStart,
        onFileUploadStop,
        onFileUploadProgress,
        dictionary,
        isAttachment: inputRef.current?.accept === "*",
        attrs,
      });
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    props.onClose();
  };

  const filtered = React.useMemo(() => {
    const { embeds = [], search = "", uploadFile, filterable = true } = props;
    let items: (EmbedDescriptor | MenuItem)[] = [...props.items];
    const embedItems: EmbedDescriptor[] = [];

    for (const embed of embeds) {
      if (embed.title && embed.visible !== false && !embed.disabled) {
        embedItems.push(
          new EmbedDescriptor({
            ...embed,
            name: "embed",
          })
        );
      }
    }

    if (embedItems.length) {
      items = items.concat(
        {
          name: "separator",
        },
        embedItems
      );
    }

    const searchInput = search.toLowerCase();

    const matchesSearch = (item: MenuItem | EmbedDescriptor) =>
      (item.name || "").toLocaleLowerCase().includes(searchInput) ||
      (item.title || "").toLocaleLowerCase().includes(searchInput) ||
      (item.keywords || "").toLocaleLowerCase().includes(searchInput);

    // When searching, flatten matching children into the top-level list so
    // they are directly navigable with the keyboard. If all children match,
    // exclude the parent item since it would be redundant.
    const fullyFlattenedParents = new Set<MenuItem | EmbedDescriptor>();
    if (search && filterable) {
      const flattened: (EmbedDescriptor | MenuItem)[] = [];
      for (const item of items) {
        if ("children" in item && item.children) {
          const children = resolveChildren(item.children);
          if (children) {
            const matching = children.filter(matchesSearch);
            if (matching.length > 0) {
              for (const child of matching) {
                const { children: _, ...flat } = child;
                flattened.push(flat);
              }
              if (matching.length === children.length) {
                fullyFlattenedParents.add(item);
              }
            }
          }
        }
      }
      items = items.concat(flattened);
    }

    const filtered = items.filter((item) => {
      if (item.name === "separator") {
        return true;
      }

      if (fullyFlattenedParents.has(item)) {
        return false;
      }

      if (item.visible === false) {
        return false;
      }

      // Some extensions may be disabled, remove corresponding menu items
      if (
        item.name &&
        !commands[item.name] &&
        !commands[`create${capitalize(item.name)}`] &&
        item.name !== "noop"
      ) {
        return false;
      }

      // If no image upload callback has been passed, filter the image block out
      if (!uploadFile && item.name === "image") {
        return false;
      }

      // some items (defaultHidden) are not visible until a search query exists
      if (!search) {
        return !item.defaultHidden;
      }

      if (!filterable) {
        return item;
      }

      return matchesSearch(item);
    });

    return filterExcessSeparators(
      orderBy(
        filtered.map((item) => ({
          item,
          section:
            "section" in item && item.section && "priority" in item.section
              ? ((item.section.priority as number) ?? 0)
              : 0,
          priority: "priority" in item ? item.priority : 0,
          score:
            searchInput && item.title
              ? commandScore(item.title, searchInput)
              : 0,
        })),
        ["section", "priority", "score"],
        ["desc", "desc", "desc"]
      ).map(({ item }) => item)
    );
  }, [commands, props]);

  const openSubmenu = React.useCallback(
    (index: number) => {
      const item = filtered[index];
      if (!item) {
        return;
      }
      const children = resolveChildren(
        "children" in item ? item.children : undefined
      );
      if (!children?.length) {
        return;
      }

      const normalized = filterExcessSeparators(
        children.filter((child) => child.visible !== false)
      );
      const firstSelectable = normalized.findIndex(
        (child) =>
          child.name !== "separator" && !("disabled" in child && child.disabled)
      );
      if (firstSelectable === -1) {
        return;
      }

      setSubmenu({
        index,
        items: normalized,
        selectedIndex: firstSelectable,
      });
    },
    [filtered]
  );

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (!props.isActive) {
        return;
      }

      // Let the link input's own handlers manage navigation keys
      if (insertItem) {
        return;
      }

      // --- Submenu open: route keys into it ---
      if (submenu) {
        if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
          event.preventDefault();
          event.stopPropagation();
          const total = submenu.items.length - 1;
          let next = submenu.selectedIndex + 1;
          while (next <= total) {
            const child = submenu.items[next];
            if (
              child?.name !== "separator" &&
              !("disabled" in child && child.disabled)
            ) {
              break;
            }
            next++;
          }
          if (next <= total) {
            setSubmenu((s) => (s ? { ...s, selectedIndex: next } : s));
          }
          return;
        }

        if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
          event.preventDefault();
          event.stopPropagation();
          let prev = submenu.selectedIndex - 1;
          while (prev >= 0) {
            const child = submenu.items[prev];
            if (
              child?.name !== "separator" &&
              !("disabled" in child && child.disabled)
            ) {
              break;
            }
            prev--;
          }
          if (prev >= 0) {
            setSubmenu((s) => (s ? { ...s, selectedIndex: prev } : s));
          }
          return;
        }

        if (event.key === "ArrowLeft" || event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setSubmenu(null);
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          const child = submenu.items[submenu.selectedIndex];
          if (child) {
            handleClickItem(child);
            setSubmenu(null);
          }
          return;
        }
        return;
      }

      // --- Normal (no submenu) ---
      if (event.key === "Enter") {
        event.preventDefault();

        const item = filtered[selectedIndex];

        if (item) {
          const children = resolveChildren(
            "children" in item ? item.children : undefined
          );
          if (children?.length) {
            openSubmenu(selectedIndex);
          } else {
            handleClickItem(item);
          }
        } else {
          props.onClose(true);
        }
      }

      if (event.key === "ArrowRight") {
        const item = filtered[selectedIndex];
        if (item) {
          const children = resolveChildren(
            "children" in item ? item.children : undefined
          );
          if (children?.length) {
            event.preventDefault();
            event.stopPropagation();
            openSubmenu(selectedIndex);
            return;
          }
        }
      }

      if (
        event.key === "ArrowUp" ||
        (event.key === "Tab" && event.shiftKey) ||
        (event.ctrlKey && event.key === "p")
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (filtered.length) {
          let prevIndex = selectedIndex - 1;
          while (prevIndex >= 0) {
            const item = filtered[prevIndex];
            if (
              item?.name !== "separator" &&
              !("disabled" in item && item.disabled)
            ) {
              break;
            }
            prevIndex--;
          }
          if (prevIndex >= 0) {
            setSelectedIndex(prevIndex);
          }
        } else {
          close();
        }
      }

      if (
        event.key === "ArrowDown" ||
        (event.key === "Tab" && !event.shiftKey) ||
        (event.ctrlKey && event.key === "n")
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (filtered.length) {
          const total = filtered.length - 1;
          let nextIndex = selectedIndex + 1;
          while (nextIndex <= total) {
            const item = filtered[nextIndex];
            if (
              item?.name !== "separator" &&
              !("disabled" in item && item.disabled)
            ) {
              break;
            }
            nextIndex++;
          }
          if (nextIndex <= total) {
            setSelectedIndex(nextIndex);
          }
        } else {
          close();
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown, {
      capture: true,
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
    };
  }, [
    close,
    filtered,
    handleClickItem,
    insertItem,
    openSubmenu,
    props,
    selectedIndex,
    submenu,
  ]);

  const { isActive, uploadFile } = props;
  const items = filtered;

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        close();
      }
    },
    [close]
  );

  const fileInput = uploadFile && (
    <VisuallyHidden.Root>
      <label>
        <Trans>Import document</Trans>
        <input
          type="file"
          ref={inputRef}
          onChange={handleFilesPicked}
          multiple
        />
      </label>
    </VisuallyHidden.Root>
  );

  // Close submenu when parent selection moves away from the trigger
  React.useEffect(() => {
    if (submenu && submenu.index !== selectedIndex) {
      setSubmenu(null);
    }
  }, [selectedIndex, submenu]);

  // Cleanup hover timer on unmount
  React.useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    },
    []
  );

  const renderItems = () => {
    let prevHeading: string | undefined;

    return (
      <>
        {items.map((item, index) => {
          if (item.name === "separator") {
            return (
              <ListItem key={index}>
                <hr />
              </ListItem>
            );
          }

          if (!item.title) {
            return null;
          }

          const hasChildren = !!(
            "children" in item && resolveChildren(item.children)?.length
          );

          const handlePointerMove = (ev: React.PointerEvent) => {
            if (
              !("disabled" in item && item.disabled) &&
              selectedIndex !== index &&
              // Safari triggers pointermove with identical coordinates when the pointer has not moved.
              // This causes the menu selection to flicker when the pointer is over the menu but not moving.
              (pointerRef.current.clientX !== ev.clientX ||
                pointerRef.current.clientY !== ev.clientY)
            ) {
              setSelectedIndex(index);
            }
            pointerRef.current = {
              clientX: ev.clientX,
              clientY: ev.clientY,
            };

            // Hover to open submenu with delay
            if (hasChildren) {
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
              }
              hoverTimerRef.current = setTimeout(() => {
                openSubmenu(index);
              }, 150);
            } else {
              // Close submenu when hovering a regular item
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
              }
              setSubmenu(null);
            }
          };

          const handlePointerDown = () => {
            if (
              !("disabled" in item && item.disabled) &&
              selectedIndex !== index
            ) {
              setSelectedIndex(index);
            }
          };

          const handleOnClick = (ev: React.MouseEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (hasChildren) {
              openSubmenu(index);
            } else {
              handleClickItem(item);
            }
          };

          const currentHeading =
            "section" in item ? item.section?.({ t }) : undefined;

          const itemRef = (node: HTMLElement | null) => {
            if (node) {
              itemRefs.current.set(index, node);
            } else {
              itemRefs.current.delete(index);
            }
          };

          const response = (
            <React.Fragment key={`${index}-${item.name}`}>
              {currentHeading !== prevHeading && (
                <MenuHeader key={currentHeading}>{currentHeading}</MenuHeader>
              )}
              <ListItem
                ref={itemRef}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
              >
                {props.renderMenuItem(item as any, index, {
                  selected: index === selectedIndex,
                  disclosure: hasChildren,
                  onClick: handleOnClick,
                })}
              </ListItem>
            </React.Fragment>
          );

          prevHeading = currentHeading;
          return response;
        })}
        {items.length === 0 && (
          <ListItem>
            <Empty>{dictionary.noResults}</Empty>
          </ListItem>
        )}
      </>
    );
  };

  if (isMobile) {
    return (
      <>
        <Drawer open={isActive} onOpenChange={handleOpenChange}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerTitle hidden>{props.trigger}</DrawerTitle>
            <MobileScrollable hiddenScrollbars>
              {insertItem ? (
                <LinkInputWrapper>
                  <LinkInput
                    type="text"
                    placeholder={
                      "placeholder" in insertItem && !!insertItem.placeholder
                        ? insertItem.placeholder
                        : insertItem.title
                          ? dictionary.pasteLinkWithTitle(insertItem.title)
                          : dictionary.pasteLink
                    }
                    onKeyDown={handleLinkInputKeydown}
                    onPaste={handleLinkInputPaste}
                    autoFocus
                  />
                </LinkInputWrapper>
              ) : (
                <List>{renderItems()}</List>
              )}
            </MobileScrollable>
          </DrawerContent>
        </Drawer>
        {fileInput}
      </>
    );
  }

  return (
    <>
      <Popover open={isActive} onOpenChange={handleOpenChange} modal={false}>
        <PopoverAnchor virtualRef={caretRef} />
        <BouncyPopoverContent
          side="bottom"
          align="start"
          width={280}
          shrink
          style={{
            padding: 0,
            maxHeight:
              "min(324px, var(--radix-popover-content-available-height))",
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (submenuContentRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          {insertItem ? (
            <LinkInputWrapper>
              <LinkInput
                type="text"
                placeholder={
                  "placeholder" in insertItem && !!insertItem.placeholder
                    ? insertItem.placeholder
                    : insertItem.title
                      ? dictionary.pasteLinkWithTitle(insertItem.title)
                      : dictionary.pasteLink
                }
                onKeyDown={handleLinkInputKeydown}
                onPaste={handleLinkInputPaste}
                autoFocus
              />
            </LinkInputWrapper>
          ) : (
            <List>{renderItems()}</List>
          )}
          {fileInput}
        </BouncyPopoverContent>
      </Popover>
      {submenu && itemRefs.current.get(submenu.index) && (
        <Popover open modal={false}>
          <PopoverAnchor
            virtualRef={{
              current: {
                getBoundingClientRect: () =>
                  itemRefs.current.get(submenu.index)!.getBoundingClientRect(),
              },
            }}
          />
          <SubmenuPopoverContent
            ref={submenuContentRef}
            side="right"
            align="start"
            sideOffset={0}
            width={220}
            shrink
            style={{ padding: 0 }}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerLeave={() => setSubmenu(null)}
          >
            <MouseSafeArea parentRef={submenuContentRef} />
            <List>
              {submenu.items.map((child, childIndex) => {
                if (child.name === "separator") {
                  return (
                    <ListItem key={childIndex}>
                      <hr />
                    </ListItem>
                  );
                }
                if (!child.title) {
                  return null;
                }

                const handleChildPointerMove = (ev: React.PointerEvent) => {
                  if (
                    submenu.selectedIndex !== childIndex &&
                    (pointerRef.current.clientX !== ev.clientX ||
                      pointerRef.current.clientY !== ev.clientY)
                  ) {
                    setSubmenu((s) =>
                      s ? { ...s, selectedIndex: childIndex } : s
                    );
                  }
                  pointerRef.current = {
                    clientX: ev.clientX,
                    clientY: ev.clientY,
                  };
                };

                const handleChildClick = (ev: React.MouseEvent) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  handleClickItem(child);
                  setSubmenu(null);
                };

                return (
                  <ListItem
                    key={`sub-${childIndex}-${child.name}`}
                    onPointerMove={handleChildPointerMove}
                  >
                    {props.renderMenuItem(child as any, childIndex, {
                      selected: childIndex === submenu.selectedIndex,
                      onClick: handleChildClick,
                    })}
                  </ListItem>
                );
              })}
            </List>
          </SubmenuPopoverContent>
        </Popover>
      )}
    </>
  );
}

const bouncyFadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
`;

const BouncyPopoverContent = styled(PopoverContent)`
  &[data-state="open"] {
    animation: ${bouncyFadeIn} 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
`;

const SubmenuPopoverContent = styled(PopoverContent)`
  max-height: min(324px, var(--radix-popover-content-available-height));
`;

const LinkInputWrapper = styled.div`
  margin: 8px;
`;

const LinkInput = styled(Input)`
  height: 32px;
  width: 100%;
  color: ${s("textSecondary")};
`;

const List = styled.ol`
  list-style: none;
  text-align: left;
  height: 100%;
  padding: 6px;
  margin: 0;
  white-space: nowrap;

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid ${s("divider")};
  }
`;

const ListItem = styled.li`
  padding: 0;
  margin: 0;
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  color: ${s("textSecondary")};
  font-weight: 500;
  font-size: 14px;
  height: 32px;
  padding: 0 16px;
`;

const MobileScrollable = styled(Scrollable)`
  max-height: 75vh;
`;

export default SuggestionsMenu;
