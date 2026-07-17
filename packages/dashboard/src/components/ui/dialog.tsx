"use client";

import { X } from "@phosphor-icons/react";
import type { HTMLAttributes, ReactNode } from "react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

interface DialogTriggerProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

interface DialogPortalProps {
  children: ReactNode;
}

interface DialogCloseProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

interface DialogOverlayProps {
  className?: string;
  onClose?: () => void;
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  className?: string;
}

interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

const Dialog = ({ open, onOpenChange, children, className }: DialogProps) => {
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <DialogPortal>
      <DialogOverlay onClose={() => onOpenChange(false)} />
      <DialogContent className={className}>{children}</DialogContent>
    </DialogPortal>
  );
};

const DialogPortal = ({ children }: DialogPortalProps) => {
  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(children, document.body);
};

const DialogOverlay = ({ className, onClose }: DialogOverlayProps) => (
  <button
    type="button"
    aria-label="Close dialog"
    tabIndex={-1}
    className={cn(
      "fixed inset-0 z-50 cursor-default bg-black/60 backdrop-blur-sm animate-in fade-in-200",
      className,
    )}
    onClick={onClose}
  />
);

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Moves focus into the dialog on mount, traps Tab/Shift+Tab within it, and
 * restores focus to the element that opened it on unmount. `DialogContent`
 * only ever mounts while `open` is true (see `Dialog` above), so a plain
 * mount/unmount effect is sufficient to cover the whole open/close lifecycle.
 */
function useFocusTrap(panelRef: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const getFocusable = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    const focusable = getFocusable();
    (focusable[0] ?? panel)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!items.includes(active as HTMLElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [panelRef]);
}

const DialogContent = ({ children, className, title, description }: DialogContentProps) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-edge bg-base p-6 shadow-xl animate-in slide-in-from-top-4 fade-in-200 sm:max-w-lg",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-description" : undefined}
    >
      <div className="absolute right-4 top-4">
        <DialogClose asChild>
          <Button
            variant="ghost"
            className="size-9 rounded-[var(--radius)] text-fg-4 hover:text-fg hover:bg-panel2"
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden />
          </Button>
        </DialogClose>
      </div>
      {title && (
        <DialogHeader>
          <DialogTitle id="dialog-title">{title}</DialogTitle>
          {description && (
            <DialogDescription id="dialog-description">{description}</DialogDescription>
          )}
        </DialogHeader>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
};

const DialogHeader = ({ children, className }: DialogHeaderProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
);

const DialogTitle = ({ children, className, ...rest }: DialogTitleProps) => (
  <h2 className={cn("text-[17px] font-semibold tracking-tight text-fg", className)} {...rest}>
    {children}
  </h2>
);

const DialogDescription = ({ children, className, ...rest }: DialogDescriptionProps) => (
  <p className={cn("text-[13px] leading-5 text-fg-3", className)} {...rest}>
    {children}
  </p>
);

const DialogFooter = ({ children, className }: DialogFooterProps) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:items-center mt-4",
      className,
    )}
  >
    {children}
  </div>
);

const DialogTrigger = ({ children, className }: DialogTriggerProps) => {
  const [open, setOpen] = React.useState(false);
  const child = React.Children.only(children);

  if (!React.isValidElement(child)) {
    return <>{child}</>;
  }

  const childElement = child as React.ReactElement<any>;

  return (
    <>
      {React.cloneElement(childElement, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen(true);
        },
        className: cn(childElement.props.className, className),
      })}
      <Dialog open={open} onOpenChange={setOpen}>
        {React.Children.map(childElement.props.children, (c) => c)}
      </Dialog>
    </>
  );
};

const DialogClose = ({ children, className }: DialogCloseProps) => {
  const child = React.Children.only(children);

  if (!React.isValidElement(child)) {
    return <>{child}</>;
  }

  const childElement = child as React.ReactElement<any>;

  return React.cloneElement(childElement, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      const dialog = e.currentTarget.closest('[role="dialog"]') as HTMLElement | null;
      if (dialog) {
        const closeBtn = dialog.querySelector('[aria-label="Close dialog"]') as HTMLElement;
        closeBtn?.click();
      }
    },
    className: cn(childElement.props.className, className),
  });
};

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogOverlay,
  DialogPortal,
};
