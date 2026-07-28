import {
  UserRole,
  type Amenity,
  type PropertyMedia,
  type PropertyTag,
} from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import {
  DuplicateCatalogSlugError,
  type CatalogCreateInput,
  type CatalogRecord,
  type CatalogRepository,
  type CatalogUpdateInput,
  type MediaRepository,
} from "../repositories/metadata.repository.js";
import type {
  CreateMediaInput,
  UpdateMediaInput,
} from "../validators/metadata.validators.js";

type Clock = () => Date;
export type MediaResponse = Omit<PropertyMedia, "fileSize" | "metadata"> & {
  fileSize: string;
  metadata: unknown;
};

export interface MediaServiceContract {
  list(actor: AuthenticatedUser, propertyId: string): Promise<MediaResponse[]>;
  create(
    actor: AuthenticatedUser,
    propertyId: string,
    input: CreateMediaInput,
  ): Promise<MediaResponse>;
  update(
    actor: AuthenticatedUser,
    propertyId: string,
    mediaId: string,
    input: UpdateMediaInput,
  ): Promise<MediaResponse>;
  remove(
    actor: AuthenticatedUser,
    propertyId: string,
    mediaId: string,
  ): Promise<void>;
}

export class MediaService implements MediaServiceContract {
  constructor(
    private readonly repository: MediaRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async list(actor: AuthenticatedUser, propertyId: string) {
    if (!(await this.repository.propertyExists(actor.agencyId, propertyId))) {
      throw propertyNotFound();
    }
    return (await this.repository.list(actor.agencyId, propertyId)).map(
      toMedia,
    );
  }

  async create(
    actor: AuthenticatedUser,
    propertyId: string,
    input: CreateMediaInput,
  ) {
    await this.requireModificationAccess(actor, propertyId);
    const media = await this.repository.create(
      actor.agencyId,
      propertyId,
      actor.id,
      input,
    );
    if (!media) throw propertyNotFound();
    return toMedia(media);
  }

  async update(
    actor: AuthenticatedUser,
    propertyId: string,
    mediaId: string,
    input: UpdateMediaInput,
  ) {
    await this.requireModificationAccess(actor, propertyId);
    const media = await this.repository.update(
      actor.agencyId,
      propertyId,
      mediaId,
      input,
    );
    if (!media) throw mediaNotFound();
    return toMedia(media);
  }

  async remove(actor: AuthenticatedUser, propertyId: string, mediaId: string) {
    await this.requireModificationAccess(actor, propertyId);
    if (
      !(await this.repository.softDelete(
        actor.agencyId,
        propertyId,
        mediaId,
        this.clock(),
      ))
    ) {
      throw mediaNotFound();
    }
  }

  private async requireModificationAccess(
    actor: AuthenticatedUser,
    propertyId: string,
  ) {
    const privileged =
      actor.role === UserRole.OWNER || actor.role === UserRole.ADMIN;
    if (
      !(await this.repository.propertyCanModify(
        actor.agencyId,
        propertyId,
        actor.id,
        privileged,
      ))
    ) {
      if (await this.repository.propertyExists(actor.agencyId, propertyId)) {
        throw new AppError("Insufficient permissions", 403);
      }
      throw propertyNotFound();
    }
  }
}

export interface CatalogServiceContract<T extends CatalogRecord> {
  list(actor: AuthenticatedUser): Promise<T[]>;
  get(actor: AuthenticatedUser, id: string): Promise<T>;
  create(actor: AuthenticatedUser, input: CatalogCreateInput): Promise<T>;
  update(
    actor: AuthenticatedUser,
    id: string,
    input: CatalogUpdateInput,
  ): Promise<T>;
  remove(actor: AuthenticatedUser, id: string): Promise<void>;
}

export class CatalogService<
  T extends CatalogRecord,
> implements CatalogServiceContract<T> {
  constructor(
    private readonly label: "Amenity" | "Tag",
    private readonly repository: CatalogRepository<T>,
    private readonly clock: Clock = () => new Date(),
  ) {}

  list(actor: AuthenticatedUser) {
    return this.repository.list(actor.agencyId);
  }

  async get(actor: AuthenticatedUser, id: string) {
    const record = await this.repository.findById(actor.agencyId, id);
    if (!record) throw this.notFound();
    return record;
  }

  async create(actor: AuthenticatedUser, input: CatalogCreateInput) {
    try {
      return await this.repository.create(actor.agencyId, input);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: CatalogUpdateInput,
  ) {
    try {
      const record = await this.repository.update(actor.agencyId, id, input);
      if (!record) throw this.notFound();
      return record;
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async remove(actor: AuthenticatedUser, id: string) {
    if (!(await this.repository.softDelete(actor.agencyId, id, this.clock()))) {
      throw this.notFound();
    }
  }

  private notFound() {
    return new AppError(`${this.label} not found`, 404);
  }

  private mapWriteError(error: unknown) {
    return error instanceof DuplicateCatalogSlugError
      ? new AppError(`${this.label} slug already exists`, 409)
      : error;
  }
}

export type AmenityServiceContract = CatalogServiceContract<Amenity>;
export type TagServiceContract = CatalogServiceContract<PropertyTag>;

const toMedia = (media: PropertyMedia): MediaResponse => ({
  ...media,
  fileSize: media.fileSize.toString(),
  metadata: media.metadata,
});
const propertyNotFound = () => new AppError("Property not found", 404);
const mediaNotFound = () => new AppError("Property media not found", 404);
