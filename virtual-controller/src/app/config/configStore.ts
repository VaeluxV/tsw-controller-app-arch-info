import { Preferences } from '@capacitor/preferences';
import z from 'zod';
import { layoutConfigSchema, TLayoutConfigSchema } from './layoutConfigSchema';

enum ConfigKeys {
  LAYOUTS = 'app.config.layouts'
}

export const configStore = {
  layouts: {
    get: async (): Promise<TLayoutConfigSchema[]> => {
      try {
        const { value } = await Preferences.get({ key: ConfigKeys.LAYOUTS })
        if (!value) return []
        const parsedJson = z.array(layoutConfigSchema).safeParse(JSON.parse(value))
        if (!parsedJson.success) return []
        return parsedJson.data
      } catch {
        return []
      }
    },
    save: (layouts: TLayoutConfigSchema[]) => {
      return Preferences.set({
        key: ConfigKeys.LAYOUTS,
        value: JSON.stringify(layouts)
      })
    }
  }
}