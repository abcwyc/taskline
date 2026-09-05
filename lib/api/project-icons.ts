import {
   Accessibility,
   Bell,
   Blocks,
   Bomb,
   Box,
   BrickWall,
   CircleHelp,
   Cuboid,
   Globe,
   Grid2x2,
   LayoutDashboard,
   Loader,
   Lock,
   Play,
   RectangleEllipsis,
   Settings,
   Shapes,
   Table,
   TrafficCone,
   Vault,
   Wallpaper,
   type LucideIcon,
} from 'lucide-react';

/**
 * Project icon registry: DB stores the icon as a name string
 * (`ProjectDTO.iconKey`), the UI needs the component. Keep this list in sync
 * with whatever the "change project icon" picker offers. `Box` is the fallback.
 *
 * (Deliberately explicit rather than `import * as Lucide` so the client bundle
 * only ships the icons that are actually selectable.)
 */
export const PROJECT_ICONS: Record<string, LucideIcon> = {
   Accessibility,
   Bell,
   Blocks,
   Bomb,
   Box,
   BrickWall,
   CircleHelp,
   Cuboid,
   Globe,
   Grid2x2,
   LayoutDashboard,
   Loader,
   Lock,
   Play,
   RectangleEllipsis,
   Settings,
   Shapes,
   Table,
   TrafficCone,
   Vault,
   Wallpaper,
};

export const PROJECT_ICON_NAMES = Object.keys(PROJECT_ICONS);

export function resolveProjectIcon(iconKey: string | undefined | null): LucideIcon {
   return (iconKey && PROJECT_ICONS[iconKey]) || Box;
}
