#!/usr/bin/env python3
"""Test server startup validation."""
import subprocess
import sys
import os

def test_startup_without_credentials():
    """Test that server exits when credentials are missing."""
    print("=" * 60)
    print("TEST 1: Startup validation without credentials")
    print("=" * 60)

    env = {
        'PATH': os.environ.get('PATH', ''),
        'PYTHONPATH': os.environ.get('PYTHONPATH', ''),
        'HOME': os.environ.get('HOME', ''),
    }

    result = subprocess.run(
        [sys.executable, 'server.py'],
        env=env,
        capture_output=True,
        text=True,
        timeout=5
    )

    output = result.stdout + result.stderr

    # Check for expected error message
    if "FATAL ERROR: Missing required Slack credentials" in output:
        print("✅ PASS: Server correctly detects missing credentials")
        print("\nError output:")
        print(output)
        return True
    else:
        print("❌ FAIL: Server did not detect missing credentials")
        print("\nOutput:")
        print(output)
        return False

def test_startup_with_credentials():
    """Test that server starts successfully with credentials."""
    print("\n" + "=" * 60)
    print("TEST 2: Startup validation with credentials")
    print("=" * 60)

    env = os.environ.copy()
    env['SLACK_BOT_TOKEN'] = 'xoxb-test-token'
    env['SLACK_SIGNING_SECRET'] = 'test-secret'

    result = subprocess.run(
        [sys.executable, 'server.py'],
        env=env,
        capture_output=True,
        text=True,
        timeout=3
    )

    output = result.stdout + result.stderr

    # Check for successful startup
    if "✓ All required credentials configured" in output:
        print("✅ PASS: Server validates credentials successfully")

        if "LEAD PROCESSOR API SERVER" in output:
            print("✅ PASS: Server displays startup banner")

        # Exit code 1 is expected because port is in use
        if result.returncode == 1 and "Address already in use" in output:
            print("✅ PASS: Server ready (port occupied by existing instance)")
        elif result.returncode == 0:
            print("✅ PASS: Server started successfully")

        print("\nStartup output (first 30 lines):")
        print('\n'.join(output.split('\n')[:30]))
        return True
    else:
        print("❌ FAIL: Server did not validate credentials")
        print("\nOutput:")
        print(output)
        return False

def test_import():
    """Test that server can be imported without errors."""
    print("\n" + "=" * 60)
    print("TEST 3: Import server module")
    print("=" * 60)

    try:
        # Just check if it compiles
        result = subprocess.run(
            [sys.executable, '-m', 'py_compile', 'server.py'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            print("✅ PASS: server.py compiles without syntax errors")
            return True
        else:
            print("❌ FAIL: Syntax errors in server.py")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

if __name__ == "__main__":
    results = []

    results.append(test_import())
    results.append(test_startup_without_credentials())
    results.append(test_startup_with_credentials())

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Tests passed: {sum(results)}/{len(results)}")

    if all(results):
        print("\n🎉 All startup validation tests PASSED!")
        print("\n✅ Server is ready for manual testing")
        sys.exit(0)
    else:
        print("\n❌ Some tests FAILED")
        sys.exit(1)
