export const snapNumber = (value: number, snap: number) => {
  const lowerbound = (value - value % snap)
  const upperbound = lowerbound + snap
  const distancetolower = Math.abs(lowerbound - value)
  const distancetoupper = Math.abs(upperbound - value)
  if (distancetolower < distancetoupper) return lowerbound
  return upperbound
}