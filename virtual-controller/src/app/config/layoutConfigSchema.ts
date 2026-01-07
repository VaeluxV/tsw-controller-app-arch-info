import z from "zod";
import { ControlColor } from "./controlColors";

const layoutConfigBaseControlOptionsSchema = z.object({
  color: z.enum(ControlColor),
  position: z.object({ x: z.number(), y: z.number() })
})

const layoutConfigSliderControlOptionsSchema = layoutConfigBaseControlOptionsSchema.extend({
  snap: z.number().nullish()
})

const layoutConfigButtonSchema = z.object({
  type: z.literal("button"),
  name: z.string(),
  options: layoutConfigBaseControlOptionsSchema
})

const layoutConfigSliderSchema = z.object({
  type: z.literal("slider"),
  name: z.string(),
  options: layoutConfigSliderControlOptionsSchema
})

const layoutConfigCenteredSliderSchema = z.object({
  type: z.literal("slider_centered"),
  name: z.string(),
  options: layoutConfigSliderControlOptionsSchema
})

export const layoutConfigSchema = z.object({
  name: z.string(),
  controls: z.array(z.union([layoutConfigButtonSchema, layoutConfigSliderSchema, layoutConfigCenteredSliderSchema]))
})

export type TLayoutConfigBaseControlOptionsSchema = z.output<typeof layoutConfigBaseControlOptionsSchema>
export type TLayoutConfigSliderControlOptionsSchema = z.output<typeof layoutConfigSliderControlOptionsSchema>

export type TLayoutConfigSchema = z.output<typeof layoutConfigSchema>
export type TLayoutConfigButtonSchema = z.output<typeof layoutConfigButtonSchema>
export type TLayoutConfigSliderSchema = z.output<typeof layoutConfigSliderSchema>
export type TLayoutConfigCenteredSliderSchema = z.output<typeof layoutConfigCenteredSliderSchema>
