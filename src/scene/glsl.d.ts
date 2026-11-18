// Um arquivo .glsl importado é o texto do shader (ver a regra `asset/source` em next.config.ts).
declare module "*.glsl" {
  const source: string;
  export default source;
}
