import React, { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string | number;
  label: string;
  subLabel?: string;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  label?: string;
  options: SearchableOption[];
  value: string | number;
  onChange: (e: { target: { value: string } }) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  name,
  label,
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  className,
  error,
  required,
  disabled,
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.subLabel?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string | number) => {
    onChange({ target: { value: String(val) } });
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ target: { value: "" } });
    setSearch("");
  };

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-2 w-full rounded-lg border border-input bg-card px-3 py-2 transition-colors min-h-[40px]",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-ring",
            error && "border-destructive focus:ring-destructive",
            !selectedOption && !isOpen && "text-muted-foreground"
          )}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
        >
          {isOpen ? (
            <div className="flex items-center gap-2 w-full h-full">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Ketik untuk mencari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground h-full min-w-0"
              />
              {search ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                  }}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={12} />
                </button>
              ) : (
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
              )}
            </div>
          ) : selectedOption ? (
            <div className="flex items-center justify-between w-full h-full">
              <div className="truncate pr-2">
                <p className="text-sm font-medium text-foreground truncate">{selectedOption.label}</p>
                {selectedOption.subLabel && (
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
                    {selectedOption.subLabel}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full h-full">
              <span className="text-sm truncate">{placeholder}</span>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada pilihan"}
                </p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-border/50 sticky top-0 bg-card z-10">
                  <p className="text-[10px] text-muted-foreground">
                    {filteredOptions.length} hasil ditemukan
                  </p>
                </div>
                {filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0",
                      String(value) === String(opt.value) && "bg-muted"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-foreground truncate">{opt.label}</p>
                      {opt.subLabel && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{opt.subLabel}</p>
                      )}
                    </div>
                    {String(value) === String(opt.value) && (
                      <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
