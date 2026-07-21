import React from "react";
import { COLORS, STATUS_STYLES } from "./adminTheme";

// Shared small presentational pieces used across the Phase A admin backend.

export const StatusPill = ({ status }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.hidden;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
};

export const SectionCard = ({ title, description, action, children, className = "" }) => (
  <div
    className={`bg-white rounded-xl border ${className}`}
    style={{ borderColor: COLORS.border, padding: 20 }}
  >
    {(title || action) && (
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          {title && (
            <h3 className="text-[18px] font-semibold" style={{ color: COLORS.textPrimary }}>
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const FieldLabel = ({ children, required }) => (
  <label className="block text-[14px] font-medium mb-1.5" style={{ color: COLORS.textPrimary }}>
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

export const HelperText = ({ children }) => (
  <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>
    {children}
  </p>
);

export const FormField = ({ label, required, helper, error, children }) => (
  <div className="mb-4">
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    {children}
    {error ? (
      <p className="text-xs mt-1 text-red-600">{error}</p>
    ) : helper ? (
      <HelperText>{helper}</HelperText>
    ) : null}
  </div>
);

export const PrimaryButton = ({ children, className = "", style, ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    style={{ backgroundColor: COLORS.secondary, ...style }}
    {...props}
  >
    {children}
  </button>
);

export const ColorSwatchPicker = ({ value, onChange, palette }) => (
  <div className="flex flex-wrap gap-2">
    {palette.map((c) => (
      <button
        type="button"
        key={c.value}
        title={c.name}
        onClick={() => onChange(c.value)}
        className="w-8 h-8 rounded-full border-2 transition-transform"
        style={{
          backgroundColor: c.value,
          borderColor: value === c.value ? COLORS.secondary : "transparent",
          transform: value === c.value ? "scale(1.1)" : "scale(1)",
        }}
      />
    ))}
  </div>
);

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-16">
    {icon && <div className="text-4xl mb-3">{icon}</div>}
    <p className="font-medium" style={{ color: COLORS.textPrimary }}>{title}</p>
    {description && <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
