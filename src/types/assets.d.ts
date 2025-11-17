declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.svg";
declare module "*.gif";
declare module "*.webp";
declare module "*.woff";
declare module "*.woff2";
declare module "*.ttf";
declare module "*.otf";

// Allow using figma:asset imports as string modules to satisfy TypeScript.
declare module "figma:asset/*";