import { Fragment, VNode } from "preact"
import { useState } from "preact/hooks"
import { JSXInternal } from "preact/src/jsx"

export function ExchangeXmlTos({ doc }: { doc: Document }) {
  const termsNode = doc.querySelector('[ids=terms-of-service]')
  if (!termsNode) {
    return <div>not found</div>
  }
  return <Fragment>
    {Array.from(termsNode.children).map(renderChild)}
  </Fragment>
}

function renderChild(child: Element): VNode {
  const children = Array.from(child.children)
  switch (child.nodeName) {
    case 'title': return <header>{child.textContent}</header>
    case '#text': return <Fragment />
    case 'paragraph': return <p>{child.textContent}</p>
    case 'section': {
      return <AnchorWithOpenState href={`#terms-${child.getAttribute('ids')}`}>
        {children.map(renderChild)}
      </AnchorWithOpenState>
    }
    case 'bullet_list': {
      return <ul>{children.map(renderChild)}</ul>
    }
    case 'enumerated_list': {
      return <ol>{children.map(renderChild)}</ol>
    }
    case 'list_item': {
      return <li>{children.map(renderChild)}</li>
    }
    case 'block_quote': {
      return <div>{children.map(renderChild)}</div>
    }
    default: return <div style={{ color: 'red', display: 'hidden' }}>unknown tag {child.nodeName} <a></a></div>
  }
}

function AnchorWithOpenState(props: JSXInternal.HTMLAttributes<HTMLAnchorElement>) {
  const [open, setOpen] = useState<boolean>(false)
  function doClick(e: JSXInternal.TargetedMouseEvent<HTMLAnchorElement>) {
    setOpen(!open);
    e.stopPropagation();
    e.preventDefault();
  }
  return <a data-open={JSON.stringify(open)} onClick={doClick} {...props} />
}

