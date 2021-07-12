import { useState } from "preact/hooks";
import arrowDown from '../../static/img/chevron-down.svg';
import { ErrorBox } from "./styled";

export function ErrorMessage({ title, description }: { title?: string; description?: string; }) {
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  if (!title)
    return null;
  return <ErrorBox>
    <div>
      <p>{title}</p>
      { description && <button onClick={() => { setShowErrorDetail(v => !v); }}>
        <img style={{ height: '1.5em' }} src={arrowDown} />
      </button> }
    </div>
    {showErrorDetail && <p>{description}</p>}
  </ErrorBox>;
}
