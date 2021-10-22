
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function StartScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  return (
    <AnastasisClientFrame hideNav title="Home">
      <div>
        <section class="section is-main-section">
          <div class="columns">
            <div class="column" />
            <div class="column is-four-fifths">

              <div class="buttons is-right">
                <button class="button is-success" autoFocus onClick={() => reducer.startBackup()}>
                  Backup
                </button>

                <button class="button is-info" onClick={() => reducer.startRecover()}>Recover</button>
              </div>

            </div>
            <div class="column" />
          </div>
        </section>
      </div>
    </AnastasisClientFrame>
  );
}
