export enum ControlColor {
  PURPLE = 'purple',
  BLUE = 'blue',
  RED = 'red',
  YELLOW = 'yellow',
  GREEN = 'green',
  ORANGE = 'orange',
  PINK = 'pink',
}

export const controlColors = Object.values(ControlColor) as ControlColor[]

export const controlColorCssVariables = {
  [ControlColor.PURPLE]: '--color-purple-500',
  [ControlColor.BLUE]: '--color-blue-500',
  [ControlColor.RED]: '--color-red-500',
  [ControlColor.YELLOW]: '--color-yellow-500',
  [ControlColor.GREEN]: '--color-green-500',
  [ControlColor.ORANGE]: '--color-orange-500',
  [ControlColor.PINK]: '--color-pink-500',
}