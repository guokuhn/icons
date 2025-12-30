import React, { useEffect, useMemo } from 'react';
import { Icon as IconifyIcon, IconProps as IconifyIconProps, addIcon } from '@iconify/react';
import type { IconifyIcon as IconifyIconData } from '@iconify/react';

/**
 * 图标数据接口 - 用于动态注册图标
 */
export interface IconInfo {
  name: string;
  body: string;
  width?: number;
  height?: number;
}

export interface IconProps extends Omit<IconifyIconProps, 'icon'> {
  /**
   * 图标名称或图标数据对象
   * - 字符串格式：@gd:collection:name 或 collection:name（自动添加 @gd: 前缀）
   * - 对象格式：{ name, body, width?, height? }（会自动注册到 iconify）
   */
  icon: string | IconInfo;
  /**
   * 图标大小，可以是数字（px）或字符串
   */
  size?: string | number;
  /**
   * 图标颜色
   */
  color?: string;
  /**
   * 旋转角度（0=0°, 1=90°, 2=180°, 3=270°）
   */
  rotate?: number;
  /**
   * 是否水平翻转
   */
  hFlip?: boolean;
  /**
   * 是否垂直翻转
   */
  vFlip?: boolean;
}

/**
 * 批量注册图标到 iconify
 * @param icons 图标数据数组
 * @param prefix 图标前缀，默认 'gd'
 */
export function registerIcons(icons: IconInfo[], prefix = 'gd'): void {
  icons.forEach(icon => {
    const iconData: IconifyIconData = {
      body: icon.body,
      width: icon.width || 24,
      height: icon.height || 24,
    };
    addIcon(`${prefix}:${icon.name}`, iconData);
  });
}

/**
 * Icon组件 - 基于本地 iconify 服务
 * 
 * @example
 * ```tsx
 * // 使用字符串图标名称（需要预先注册或通过 API 加载）
 * <Icon icon="gd:home" size={24} color="#333" />
 * 
 * // 使用图标数据对象（会自动注册）
 * <Icon icon={{ name: 'home', body: '<path d="..." />' }} size={24} />
 * ```
 */
const Icon: React.FC<IconProps> = ({ 
  icon, 
  size = 24, 
  color, 
  rotate,
  hFlip,
  vFlip,
  style,
  ...rest 
}) => {
  // 判断是字符串还是对象
  const isIconInfo = typeof icon === 'object' && 'body' in icon;
  
  // 计算图标名称
  const iconName = useMemo(() => {
    if (isIconInfo) {
      return `gd:${(icon as IconInfo).name}`;
    }
    const strIcon = icon as string;
    // 如果已经有前缀，直接返回；否则添加 gd: 前缀
    if (strIcon.startsWith('@gd:')) return strIcon;
    if (strIcon.includes(':')) return strIcon;
    return `gd:${strIcon}`;
  }, [icon, isIconInfo]);

  // 如果是 IconInfo 对象，注册到 iconify
  useEffect(() => {
    if (isIconInfo) {
      const iconInfo = icon as IconInfo;
      const iconData: IconifyIconData = {
        body: iconInfo.body,
        width: iconInfo.width || 24,
        height: iconInfo.height || 24,
      };
      addIcon(iconName, iconData);
    }
  }, [icon, iconName, isIconInfo]);

  const iconStyle: React.CSSProperties = {
    fontSize: typeof size === 'number' ? `${size}px` : size,
    ...style,
  };

  return (
    <IconifyIcon
      icon={iconName}
      color={color}
      style={iconStyle}
      rotate={rotate}
      hFlip={hFlip}
      vFlip={vFlip}
      {...rest}
    />
  );
};

export default Icon;
export { Icon };

// 向后兼容：保留 DirectSvgIcon 别名
export const DirectSvgIcon = Icon;
