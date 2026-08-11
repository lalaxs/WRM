# Item System And Tooltips Design

## Goal

Build a clear mobile-first item display system for the existing inventory, combat, production, and homestead UI. Items should use the existing category and quality data, inventory items should keep action-oriented detail dialogs, and non-inventory item appearances should use lightweight tap tips for quick inspection.

## Item Categories

The item registry already defines five item categories:

- `material`: materials for gathering, crafting, farming, cooking, talismans, formations, and sale.
- `equipment`: weapons, armor, accessories, and formation items used by combat or homestead systems.
- `consumable`: pills, food, feed, talisman paper, and talismans used by combat, breakthrough, beasts, and direct-use flows.
- `technique`: technique books that can be studied from the inventory.
- `quest`: task-related items reserved by the registry.

All five categories can enter the inventory when their quantity is in `player.inventory.stacks`. Currency-like items such as `lingshi` remain item records when they appear as stack data, but existing topbar currency display stays unchanged.

## Inventory Display

The inventory keeps the current fixed-capacity grid layout. Filled slots show:

- item icon
- item name
- quantity
- quality color/background

Tapping a filled inventory slot opens the current action-oriented item detail dialog. This dialog is for operations such as use, sell, equip, or study. Empty slots remain display-only.

## Informational Tips

Item appearances outside the inventory should not open the inventory action dialog. They use a shared mobile tap tip:

- Tap an item icon or item row to show a small tip near the tapped element.
- Tap outside the tip and outside item triggers to hide it.
- No hover-only behavior is required.
- The tip is global and reused rather than creating per-list popups.
- The tip displays icon, name, quality, category, quantity or required count when available, owned/available count when relevant, and description.
- Tips are read-only and do not contain use/sell/equip actions.

Initial informational surfaces:

- combat loot item cells
- battle supply cells with configured item IDs
- production recipe ingredient rows and output rows
- gathering resource drop rows and fishing species rows when they represent item IDs
- homestead formation cards and beast tame/training material rows
- pending loot item rows

## Shared UI Boundary

Add one shared UI helper for item interactions:

- `openInventoryItemAction(item)` opens the action dialog for inventory-owned item rows.
- `attachItemTipTrigger(element, itemLike)` attaches mobile tap behavior for read-only item inspection.
- `showItemTip(itemLike, anchorElement)` renders the global tip.
- `hideItemTip()` hides it.

`itemLike` should accept either a full inventory/query row or a minimal object with `itemId`, `quantity`, `required`, `owned`, or `available`. The helper resolves missing icon, name, quality, category, and description from `ItemContent` via `GameAPI.queries.itemInfo` or an equivalent query.

## Data Flow

`content/items.js` remains the source of item metadata. Existing `Inventory.query` rows already include the data needed by the inventory. A small query should expose read-only metadata for item IDs that appear outside inventory rows, so UI code does not duplicate registry knowledge.

Suggested query shape:

```js
itemInfo({ itemId: 'healingPill' })
```

returns:

```js
{
  itemId: 'healingPill',
  name: '疗伤丹',
  category: 'consumable',
  icon: '💊',
  description: '疗伤丹，可治疗重伤、恢复气血。',
  quality: 'green',
  sellValue: 5
}
```

Unknown or malformed item IDs return `null`.

## Error Handling

If an item ID cannot be resolved, the UI should still render a readable fallback using the given item ID, package icon, common quality, and a short "暂无说明。" description. Tap handlers should ignore empty slots and rows without an item ID.

## Testing

Add focused selftests for:

- item metadata query returns icon, name, category, quality, and description for known items.
- item metadata query returns `null` for invalid and unknown IDs.
- inventory rows still include icon and quality metadata.
- UI smoke test verifies combat loot informational tips show and hide on outside tap.
- UI smoke test verifies inventory slot tap still opens the action dialog instead of the informational tip.

