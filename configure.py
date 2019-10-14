#!/usr/bin/env python3

import sys
from pathlib import Path

base_dir = Path(__file__, "../build-system/taler-build-scripts").resolve()
if not base_dir.exists():
    print(
        f"build system directory ({base_dir}) missing", file=sys.stderr
    )
    sys.exit(1)
sys.path.insert(0, str(base_dir))

from talerbuildconfig import *

b = BuildConfig()
b.enable_prefix()
b.enable_configmk()
b.add_tool(PosixTool("find"))
b.add_tool(NodeJsTool())
b.add_tool(YarnTool())
b.run()
