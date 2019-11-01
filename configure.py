# This configure.py file is places in the public domain.

# Configure the build directory.
# This file is invoked by './configure' and should usually not be invoked
# manually.

from talerbuildconfig import *

b = BuildConfig()
b.enable_prefix()
b.enable_configmk()
b.add_tool(PosixTool("find"))
b.add_tool(NodeJsTool())
b.add_tool(YarnTool())
b.run()
