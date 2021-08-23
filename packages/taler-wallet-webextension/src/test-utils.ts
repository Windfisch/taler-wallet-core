import { ComponentChildren, FunctionalComponent, h as render } from 'preact';

export function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => render(Component, args)
  r.args = props
  return r
}


export function NullLink({ children }: { children?: ComponentChildren }) {
  return render('a', { children, href: 'javascript:void(0);' })
}
