import test from "ava";
import { userIdentifierDerive } from "./crypto.js";

// Vector generated with taler-anastasis-tvg
const userIdVector = {
  input_id_data: {
    name: "Fleabag",
    ssn: "AB123",
  },
  input_server_salt: "FZ48EFS7WS3R2ZR4V53A3GFFY4",
  output_id:
    "YS45R6CGJV84K1NN7T14ZBCPVTZ6H15XJSM1FV0R748MHPV82SM0126EBZKBAAGCR34Q9AFKPEW1HRT2Q9GQ5JRA3642AB571DKZS18",
};

test("user ID derivation", async (t) => {
  const res = await userIdentifierDerive(
    userIdVector.input_id_data,
    userIdVector.input_server_salt,
  );
  t.is(res, userIdVector.output_id);
});
