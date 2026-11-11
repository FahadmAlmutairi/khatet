// With a filter on, a lane shows only some of its cards, but the server counts a position among every
// card in the lane. So the card is placed right after (or before) its visible neighbour in the full lane.
export function fullPosition(visibleIds, taskId, fullLaneIds) {
  const lane = fullLaneIds.filter((id) => id !== taskId)
  const index = visibleIds.indexOf(taskId)
  const before = visibleIds[index - 1]
  if (before !== undefined && lane.includes(before)) return lane.indexOf(before) + 2
  const after = visibleIds[index + 1]
  if (after !== undefined && lane.includes(after)) return lane.indexOf(after) + 1
  return lane.length + 1
}
