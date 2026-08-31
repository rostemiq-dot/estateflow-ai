import type { Property } from "../../../features/properties/property-data";
import { PropertyEditorModal } from "./PropertyEditorModal";

type PropertyEditModalProps = {
  property: Property;
  onClose: () => void;
  onSave: (property: Property) => boolean;
};

export function PropertyEditModal({
  property,
  onClose,
  onSave,
}: PropertyEditModalProps) {
  return (
    <PropertyEditorModal
      mode="edit"
      property={property}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
