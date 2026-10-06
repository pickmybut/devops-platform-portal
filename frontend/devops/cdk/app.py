#!/usr/bin/env python3
"""
CDK App for Platform MFE.

Uses the shared mfe_cdk_constructs package from velocity-mfe-devops.
"""

from mfe_cdk_constructs import MFEStack, MFEConfig, AppType
from aws_cdk import App

app = App()

config = MFEConfig(
    app_name="platform",
    app_type=AppType.MFE,
)

MFEStack(app, config)

app.synth()
