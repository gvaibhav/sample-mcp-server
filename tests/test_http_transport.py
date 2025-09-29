#!/usr/bin/env python3
"""
Unit tests for HTTP transport functionality.
Following TDD approach - testing the official MCP SDK implementation.
"""
import json
import os
import sys
import unittest
from pathlib import Path


class TestHTTPTransport(unittest.TestCase):
    """Test HTTP transport implementation and Docker configuration."""

    def setUp(self):
        """Set up test environment."""
        self.project_root = Path(__file__).parent.parent

    def test_project_structure(self):
        """Test basic project structure exists."""
        # Check key directories exist
        self.assertTrue((self.project_root / "src").exists())
        self.assertTrue((self.project_root / "build").exists())
        self.assertTrue((self.project_root / "tests").exists())

        # Check key files exist
        self.assertTrue((self.project_root / "package.json").exists())
        self.assertTrue((self.project_root / "tsconfig.json").exists())

    def test_docker_files_exist(self):
        """Test Docker configuration files exist."""
        self.assertTrue((self.project_root / "Dockerfile").exists())
        self.assertTrue((self.project_root / "docker-compose.yml").exists())

    def test_http_server_build(self):
        """Test HTTP server TypeScript build artifacts exist."""
        build_dir = self.project_root / "build"
        self.assertTrue((build_dir / "http-server.js").exists())
        self.assertTrue((build_dir / "http-server.d.ts").exists())

    def test_package_json_has_http_dependencies(self):
        """Test package.json includes HTTP transport dependencies."""
        package_path = self.project_root / "package.json"
        with open(package_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)

        # Should have MCP SDK and Express dependencies
        deps = package_data.get('dependencies', {})
        self.assertIn('@modelcontextprotocol/sdk', deps)
        self.assertIn('express', deps)
        self.assertIn('cors', deps)

    def test_http_server_source_exists(self):
        """Test HTTP server source file exists."""
        http_server_path = self.project_root / "src" / "http-server.ts"
        self.assertTrue(http_server_path.exists())

        # Check it imports official MCP SDK
        content = http_server_path.read_text()
        self.assertIn("@modelcontextprotocol/sdk", content)
        self.assertIn("StreamableHTTPServerTransport", content)

    def test_dockerfile_configuration(self):
        """Test Dockerfile has correct configuration."""
        dockerfile_path = self.project_root / "Dockerfile"
        content = dockerfile_path.read_text()

        # Should use Node.js base image
        self.assertIn("FROM node:", content)
        # Should copy package files
        self.assertIn("package*.json", content)
        # Should run npm ci or npm install
        self.assertTrue("npm ci" in content or "npm install" in content)
        # Should build TypeScript
        self.assertIn("npm run build", content)

    def test_virtual_environment_active(self):
        """Test that virtual environment is properly activated."""
        # Check if we're in a virtual environment
        venv_indicator = (
            hasattr(sys, 'real_prefix') or
            (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix) or
            os.environ.get('VIRTUAL_ENV') is not None
        )
        self.assertTrue(venv_indicator)

    def test_mcp_discovery_endpoint(self):
        """Test that MCP discovery endpoint configuration exists."""
        http_server_path = self.project_root / "src" / "http-server.ts"
        content = http_server_path.read_text()

        # Should have .well-known/mcp endpoint
        self.assertIn("/.well-known/mcp", content)

    def test_health_endpoint_exists(self):
        """Test that health check endpoint exists."""
        http_server_path = self.project_root / "src" / "http-server.ts"
        content = http_server_path.read_text()

        # Should have health endpoint
        self.assertIn("/health", content)


if __name__ == '__main__':
    unittest.main()
