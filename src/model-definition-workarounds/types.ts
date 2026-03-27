// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawModel = Record<string, any>;
/** Return null to exclude the model entirely. */
export type ModelDefinitionWorkaround = (model: RawModel) => RawModel | null;
