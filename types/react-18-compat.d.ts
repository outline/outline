// React 18 compatibility fixes
// Note: We avoid overriding React.ReactNode to prevent conflicts

// Missing type definitions
declare module 'dotenv' {
  export function config(options?: any): any;
  export const config: any;
}

declare module 'emoji-regex' {
  function emojiRegex(): RegExp;
  export = emojiRegex;
}

declare module 'form-data' {
  class FormData {
    append(name: string, value: any, options?: any): void;
    [key: string]: any;
  }
  export = FormData;
}

// Fix for styled-components compatibility with React 18
declare module 'styled-components' {
  interface DefaultTheme {}
  
  // Allow ForwardRefExoticComponent to be used with styled()
  function styled<T extends keyof JSX.IntrinsicElements | React.ComponentType<any>>(
    component: T
  ): any;
}

// Fix for React Router compatibility
declare module 'react-router-dom' {
  import { ComponentType } from 'react';
  
  export const Route: ComponentType<any>;
  export const Switch: ComponentType<any>;
  export const Redirect: ComponentType<any>;
}

// Fix for FontAwesome compatibility
declare module '@fortawesome/react-fontawesome' {
  import { ComponentType } from 'react';
  
  export interface FAProps {
    icon?: any;
    color?: string;
    size?: any;
    className?: string;
    [key: string]: any;
  }
  
  export const FontAwesomeIcon: ComponentType<FAProps>;
}

// Fix for framer-motion AnimatePresence
declare module 'framer-motion' {
  import { ComponentType, ReactNode } from 'react';
  
  export interface AnimatePresenceProps {
    children?: ReactNode;
    initial?: boolean;
    [key: string]: any;
  }
  
  export const AnimatePresence: ComponentType<AnimatePresenceProps>;
}

export {};
