import { h, VNode } from "preact";
import { FileButton } from "../../components/FlieButton.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame } from "./index.js";

export function StartScreen(): VNode {
  const reducer = useAnastasisContext();
  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  return (
    <AnastasisClientFrame hideNav title="Home">
      <div class="columns">
        <div class="column" />
        <div class="column is-four-fifths">
          <div class="buttons">
            <button
              class="button is-success"
              autoFocus
              onClick={() => reducer.startBackup()}
            >
              <div class="icon">
                <i class="mdi mdi-arrow-up" />
              </div>
              <span>Backup a secret</span>
            </button>

            <button
              class="button is-info"
              onClick={() => reducer.startRecover()}
            >
              <div class="icon">
                <i class="mdi mdi-arrow-down" />
              </div>
              <span>Recover a secret</span>
            </button>

            <FileButton
              label="Restore a session"
              onChange={(content) => {
                if (content?.type === "application/json") {
                  reducer.importState(content.content);
                }
              }}
            />

            {/* <button class="button">
              <div class="icon"><i class="mdi mdi-file" /></div>
              <span>Restore a session</span>
            </button> */}
          </div>
        </div>
        <div class="column" />
      </div>
    </AnastasisClientFrame>
  );
}
