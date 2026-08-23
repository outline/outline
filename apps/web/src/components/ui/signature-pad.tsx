"use client";
import React, {
    type MouseEvent,
    type TouchEvent,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { EraserSquareLinear as Eraser, DisketteLinear as Save } from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

const signaturePadVariants = cva("touch-none cursor-pencil", {
    variants: {
        variant: {
            default: "border border-input bg-input/30",
            ghost: "border-none bg-muted/50",
            outline: "border-2 border-primary bg-background",
        },
        size: {
            default: "w-full h-[200px]",
            sm: "w-full h-[150px]",
            md: "w-full h-[250px]",
            lg: "w-full h-[300px]",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});

export interface SignaturePadProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
        VariantProps<typeof signaturePadVariants> {
    /** @public (optional) - Tailwind color utility class for the pen color (e.g. "text-black", "text-primary-500") */
    penColor?: string;
    /** @public (optional) - Line width in pixels */
    lineWidth?: number;
    /** @public (optional) - Whether to show the buttons */
    showButtons?: boolean;
    /** @public (optional) - The icon to display for the save button */
    saveButtonIcon?: React.ReactNode;
    /** @public (optional) - The icon to display for the clear button */
    clearButtonIcon?: React.ReactNode;
    /** @public (optional) - Callback function to be called when the signature is saved */
    onSave?: (signature: string) => void;
    /** @public (optional) - Callback function to be called when the signature is changed */
    onChange?: (signature: string | null) => void;
}

interface SignaturePadRef {
    clear: () => void;
    save: () => void;
    toDataURL: () => string | null;
    isEmpty: () => boolean;
    getCanvas: () => HTMLCanvasElement | null;
}

const SignaturePad = React.forwardRef<SignaturePadRef, SignaturePadProps>(
    (
        {
            penColor = "hsl(var(--foreground))",
            lineWidth = 4,
            showButtons = true,
            saveButtonIcon,
            clearButtonIcon,
            variant,
            size,
            className,
            onSave,
            onChange,
            ...props
        },
        ref,
    ) => {
        const [isDrawing, setIsDrawing] = useState(false);
        const [isEmpty, setIsEmpty] = useState(true);
        const pointsRef = useRef<{ x: number; y: number }[]>([]);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

        // Expose the clear, save, toDataURL, isEmpty, and getCanvas methods to the parent component
        useImperativeHandle(ref, () => ({
            clear: handleClear,
            save: handleSave,
            toDataURL: () => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                return canvas.toDataURL("image/png");
            },
            isEmpty: () => isEmpty,
            getCanvas: () => canvasRef.current,
        }));

        // Update the canvas size for High DPI displays
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const updateCanvasSize = () => {
                const rect = canvas.getBoundingClientRect();
                const ratio = window.devicePixelRatio || 1;

                canvas.width = rect.width * ratio;
                canvas.height = rect.height * ratio;
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(ratio, ratio);
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.strokeStyle = penColor;
                    ctx.lineWidth = lineWidth;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.globalCompositeOperation = "source-over";
                    ctxRef.current = ctx;
                }
            };

            updateCanvasSize();
            window.addEventListener("resize", updateCanvasSize);

            return () => {
                window.removeEventListener("resize", updateCanvasSize);
            };
        }, [penColor, lineWidth]);

        // Get the pointer position on the canvas
        const getPointerPosition = (e: MouseEvent | TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();

            if ("touches" in e) {
                const touch = e.touches[0];
                if (!touch) return null;
                return {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                };
            }

            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        // Start drawing on the canvas
        const startDrawing = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const pointerPosition = getPointerPosition(e);
            if (!pointerPosition) return;
            setIsDrawing(true);
            pointsRef.current = [pointerPosition];
            setIsEmpty(false);
        };

        const draw = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            if (!isDrawing) return;

            const canvas = canvasRef.current;
            let ctx = ctxRef.current;
            if (!ctx)
                ctx = canvas?.getContext("2d") as CanvasRenderingContext2D;

            const newPoint = getPointerPosition(e);
            if (ctx && newPoint) {
                const updated = [...pointsRef.current, newPoint];
                if (updated.length < 2) {
                    pointsRef.current = updated;
                    return;
                }

                if (updated.length === 2) {
                    const p0 = updated[0];
                    const p1 = updated[1];
                    if (!p0 || !p1) return;
                    ctx.beginPath();
                    ctx.moveTo(p0.x, p0.y);
                    ctx.lineTo(p1.x, p1.y);
                    ctx.stroke();
                    pointsRef.current = updated;
                    return;
                }

                const previous = updated[updated.length - 3];
                const current = updated[updated.length - 2];
                const next = updated[updated.length - 1];

                if (!previous || !current || !next) {
                    pointsRef.current = updated;
                    return;
                }

                const cp1x = (previous.x + current.x) / 2;
                const cp1y = (previous.y + current.y) / 2;
                const cp2x = (current.x + next.x) / 2;
                const cp2y = (current.y + next.y) / 2;

                ctx.beginPath();
                ctx.moveTo(cp1x, cp1y);
                ctx.quadraticCurveTo(current.x, current.y, cp2x, cp2y);
                ctx.stroke();

                pointsRef.current = updated.slice(-3);
                return;
            }
        };

        const getCroppedDataURL = (canvas: HTMLCanvasElement | null): string | null => {
            if (!canvas) return null;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return null;
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
        
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha !== undefined && alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
        
            if (minX > maxX || minY > maxY) return null; // Empty canvas
        
            // Add a little padding
            const padding = 20;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(canvas.width, maxX + padding);
            maxY = Math.min(canvas.height, maxY + padding);
        
            const width = maxX - minX;
            const height = maxY - minY;
        
            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = width;
            croppedCanvas.height = height;
            const croppedCtx = croppedCanvas.getContext("2d");
            if (!croppedCtx) return null;
        
            croppedCtx.putImageData(ctx.getImageData(minX, minY, width, height), 0, 0);
            return croppedCanvas.toDataURL("image/png");
        };

        const stopDrawing = () => {
            setIsDrawing(false);
            pointsRef.current = [];
            if (isDrawing) {
                onChange?.(
                    getCroppedDataURL(canvasRef.current) || null
                );
            }
        };

        const handleClear = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
            onChange?.(null);
        };

        const handleSave = () => {
            const canvas = canvasRef.current;
            if (!canvas && isEmpty) return;
            const dataURL = getCroppedDataURL(canvas);
            if (dataURL) {
                onSave?.(dataURL);
            }
        };

        return (
            <div 
                className={cn(
                    "relative overflow-hidden rounded-lg",
                    signaturePadVariants({ variant, size }),
                    className
                )} 
                {...props}
            >
                <canvas
                    ref={canvasRef}
                    className="block w-full h-full cursor-pencil touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {showButtons && (
                    <div className="absolute bottom-2 right-2 flex gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClear}
                            className="rounded-full w-8 h-8"
                        >
                            {clearButtonIcon || <Eraser className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSave}
                            className="rounded-full w-8 h-8"
                        >
                            {saveButtonIcon || <Save className="w-4 h-4" />}
                        </Button>
                    </div>
                )}
            </div>
        );
    },
);

SignaturePad.displayName = "SignaturePad";

export { SignaturePad };
