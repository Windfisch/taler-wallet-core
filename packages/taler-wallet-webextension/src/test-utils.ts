import { FunctionalComponent, h as render } from 'preact';

export function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => render(Component, args)
  r.args = props
  return r
}

