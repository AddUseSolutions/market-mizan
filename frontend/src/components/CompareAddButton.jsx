import { useCompare } from "../context/CompareContext";
import CompareListIcon from "./CompareListIcon";

export default function CompareAddButton({ property, className }) {
  const { isSelected, canSelect, toggleProperty } = useCompare();

  if (!property?.property_id) return null;

  const selected = isSelected(property.property_id);
  const disabled = !selected && !canSelect(property.property_id);

  return (
    <CompareListIcon
      className={className}
      selected={selected}
      disabled={disabled}
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleProperty(property);
      }}
    />
  );
}
