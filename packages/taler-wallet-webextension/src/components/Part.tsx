import { AmountLike } from "@gnu-taler/taler-util";
import { ExtraLargeText, LargeText, SmallLightText } from "./styled";

export type Kind = 'positive' | 'negative' | 'neutral';
interface Props {
  title: string, text: AmountLike, kind: Kind, big?: boolean
}
export function Part({ text, title, kind, big }: Props) {
  const Text = big ? ExtraLargeText : LargeText;
  return <div style={{ margin: '1em' }}>
    <SmallLightText style={{ margin: '.5em' }}>{title}</SmallLightText>
    <Text style={{ color: kind == 'positive' ? 'green' : (kind == 'negative' ? 'red' : 'black') }}>
      {text}
    </Text>
  </div>
}
