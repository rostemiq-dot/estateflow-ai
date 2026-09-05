import { useState } from "react";
import type { Property } from "../../../features/properties/property-data";
import { createEmptyProperty } from "../../../features/properties/property-utils";
import { PropertyEditorModal } from "./PropertyEditorModal";

type PropertyCreateModalProps = { existingProperties: readonly Property[]; onClose: () => void; onCreate: (property: Property) => boolean | Promise<boolean> };

export function PropertyCreateModal({ existingProperties, onClose, onCreate }: PropertyCreateModalProps) {
  const [newProperty] = useState(() => createEmptyProperty(existingProperties));
  return <PropertyEditorModal mode="create" property={newProperty} onClose={onClose} onSave={onCreate} />;
}
