import { useEffect, useRef, useState, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import './animated-select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface AnimatedSelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement> | { target: { value: string; name?: string } }) => void;
}

/**
 * AnimatedSelect: A high-end, responsive dropdown component with fluid
 * spring animations, glassmorphism panel, active checkmark, and full keyboard navigation.
 * Synchronizes transparently with an underlying native <select> to ensure
 * 100% compatibility with screen readers, browser autofill, and automation tests.
 */
export function AnimatedSelect({
  id,
  name,
  value: propValue,
  defaultValue = '',
  options,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  error,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  onChange,
}: AnimatedSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listId = `${selectId}-dropdown-list`;

  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>(propValue !== undefined ? propValue : defaultValue);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep state in sync with external value prop
  useEffect(() => {
    if (propValue !== undefined) {
      setCurrentValue(propValue);
    }
  }, [propValue]);

  // Find currently selected option
  const selectedOption = options.find(opt => opt.value === currentValue);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLLIElement>('.animated-select-option');
      const item = items[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, highlightedIndex]);

  const selectValue = useCallback((newValue: string) => {
    setCurrentValue(newValue);
    setIsOpen(false);

    // Sync with native select
    const nativeSelect = selectRef.current;
    if (nativeSelect) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(nativeSelect, newValue);
      } else {
        nativeSelect.value = newValue;
      }
      const event = new Event('change', { bubbles: true });
      nativeSelect.dispatchEvent(event);
    }

    // Call onChange prop
    if (onChange) {
      onChange({ target: { value: newValue, name: name || id } } as React.ChangeEvent<HTMLSelectElement>);
    }

    selectRef.current?.focus();
  }, [id, name, onChange]);

  // Handle native select change (e.g. from Playwright selectOption or form reset)
  function handleNativeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCurrentValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  }

  // Keyboard navigation
  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const idx = options.findIndex(opt => opt.value === currentValue);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      } else {
        setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const idx = options.findIndex(opt => opt.value === currentValue);
        setHighlightedIndex(idx >= 0 ? idx : options.length - 1);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
        selectValue(options[highlightedIndex].value);
      } else {
        setIsOpen(prev => !prev);
        if (!isOpen) {
          const idx = options.findIndex(opt => opt.value === currentValue);
          setHighlightedIndex(idx >= 0 ? idx : 0);
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }

  const [isFocused, setIsFocused] = useState(false);

  return (
    <div ref={containerRef} className={`animated-select-container ${className}`}>
      {/* Native select element for form data, screen readers and Playwright */}
      <select
        ref={selectRef}
        id={selectId}
        name={name}
        value={currentValue}
        required={required}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || !!error}
        aria-label={ariaLabel}
        className="animated-select-native-sync"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.0001,
          cursor: disabled ? 'not-allowed' : 'pointer',
          zIndex: 10,
          border: 0,
          padding: 0,
          margin: 0,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'transparent',
          color: 'transparent',
        }}
        onChange={handleNativeChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseDown={e => {
          e.preventDefault();
          if (!disabled) {
            setIsOpen(prev => !prev);
            if (!isOpen) {
              const idx = options.findIndex(opt => opt.value === currentValue);
              setHighlightedIndex(idx >= 0 ? idx : 0);
            }
          }
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Modern interactive custom trigger display */}
      <div
        aria-hidden="true"
        className={`animated-select-trigger ${isOpen ? 'is-open' : ''} ${isFocused ? 'is-focused' : ''} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`}
      >
        <span className={`animated-select-value ${!selectedOption?.value ? 'is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : (placeholder || 'Select an option')}
        </span>
        <span className={`animated-select-icon ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <ChevronDown size={18} />
        </span>
      </div>

      {/* Fluid animated floating options menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel || placeholder}
            tabIndex={-1}
            className="animated-select-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === currentValue;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`animated-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                  onClick={() => selectValue(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="animated-select-option-text">{option.label}</span>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="animated-select-check-icon"
                      aria-hidden="true"
                    >
                      <Check size={16} />
                    </motion.span>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
