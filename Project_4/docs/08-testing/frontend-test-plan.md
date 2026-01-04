# Front-End Testing Plan

> **Version:** 1.0
> **Last Updated:** 2026-01-03
> **Project:** VerityDraft (Evidence-Ledger Copilot)

---

## 1. Overview

This document provides a comprehensive testing plan for the VerityDraft front-end application, covering unit, integration, and end-to-end tests. The plan ensures reliability, maintainability, and confidence in the user interface and business logic.

### 1.1 Testing Philosophy

- **Test Pyramid:** 60% unit tests, 30% integration tests, 10% E2E tests
- **Fast Feedback:** Unit tests should run in < 2 seconds
- **Isolation:** Each test should be independent and reproducible
- **Clarity:** Test names should describe the behavior being tested
- **Coverage:** Target 80% code coverage for critical paths

### 1.2 Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Bun Test | Fast, built-in test runner |
| Component Testing | React Testing Library | Component rendering and interactions |
| Integration Tests | Bun Test + MSW | API mocking and service integration |
| E2E Tests | Playwright | Full browser automation |
| Mocking | Bun Mock + MSW | Function and API mocking |
| Coverage | Bun Coverage | Code coverage reporting |

---

## 2. Test Structure

### 2.1 Directory Organization

```
Project_4/
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.test.tsx
│   │   │   │   ├── Input.test.tsx
│   │   │   │   ├── Modal.test.tsx
│   │   │   │   ├── Spinner.test.tsx
│   │   │   │   └── Progress.test.tsx
│   │   │   ├── evidence/
│   │   │   │   ├── VerdictBadge.test.tsx
│   │   │   │   ├── LedgerTable.test.tsx
│   │   │   │   └── CitationAnchor.test.tsx
│   │   │   ├── chat/
│   │   │   │   ├── MessageBubble.test.tsx
│   │   │   │   ├── QueryInput.test.tsx
│   │   │   │   ├── ResponseContent.test.tsx
│   │   │   │   └── MessageList.test.tsx
│   │   │   ├── documents/
│   │   │   │   ├── DocumentUpload.test.tsx
│   │   │   │   ├── DocumentCard.test.tsx
│   │   │   │   └── ChunkViewer.test.tsx
│   │   │   └── layout/
│   │   │       ├── AppLayout.test.tsx
│   │   │       ├── Header.test.tsx
│   │   │       └── Sidebar.test.tsx
│   │   ├── hooks/
│   │   │   ├── useSessions.test.ts
│   │   │   ├── useAuth.test.ts
│   │   │   └── useWebSocket.test.ts
│   │   └── utils/
│   │       ├── citations.test.ts
│   │       └── formatting.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── documents.test.ts
│   │   │   ├── sessions.test.ts
│   │   │   └── auth.test.ts
│   │   ├── websocket/
│   │   │   └── connection.test.ts
│   │   └── contexts/
│   │       ├── AuthContext.test.tsx
│   │       └── ThemeContext.test.tsx
│   ├── e2e/
│   │   ├── auth-flow.spec.ts
│   │   ├── document-upload.spec.ts
│   │   ├── qa-flow.spec.ts
│   │   ├── draft-flow.spec.ts
│   │   ├── session-history.spec.ts
│   │   └── export.spec.ts
│   ├── fixtures/
│   │   ├── data/
│   │   │   ├── mock-documents.json
│   │   │   ├── mock-sessions.json
│   │   │   └── mock-ledger.json
│   │   ├── files/
│   │   │   ├── sample.pdf
│   │   │   └── sample.docx
│   │   └── responses/
│   │       └── api-responses.json
│   ├── mocks/
│   │   ├── api-handlers.ts
│   │   ├── websocket-server.ts
│   │   └── supabase-mock.ts
│   └── helpers/
│       ├── test-utils.ts
│       ├── render-with-providers.tsx
│       └── setup.ts
├── playwright.config.ts
└── bunfig.toml
```

### 2.2 Test File Template

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentName } from '@/components/path/to/Component';

describe('ComponentName', () => {
  describe('when [condition]', () => {
    beforeEach(() => {
      // Setup before each test
    });

    afterEach(() => {
      // Cleanup after each test
    });

    test('should [expected behavior]', () => {
      // Arrange
      const props = { /* ... */ };

      // Act
      render(<ComponentName {...props} />);

      // Assert
      expect(screen.getByText('expected text')).toBeInTheDocument();
    });
  });
});
```

---

## 3. Unit Tests

### 3.1 UI Components

#### 3.1.1 Button Component

**File:** `tests/unit/components/ui/Button.test.tsx`

**Test Cases:**

```typescript
describe('Button', () => {
  describe('rendering', () => {
    test('renders with default variant', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('renders with primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
    });

    test('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200');
    });

    test('renders with danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });
  });

  describe('states', () => {
    test('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('shows loading state when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('applies correct classes for different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-sm');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-lg');
    });
  });

  describe('interactions', () => {
    test('calls onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    test('passes through aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
    });

    test('supports keyboard focus', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
```

#### 3.1.2 Input Component

**File:** `tests/unit/components/ui/Input.test.tsx`

**Test Cases:**

```typescript
describe('Input', () => {
  describe('rendering', () => {
    test('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    test('renders with label', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
    });

    test('renders with helper text', () => {
      render(<Input helperText="Use a strong password" />);
      expect(screen.getByText('Use a strong password')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    test('calls onChange when value changes', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledWith('test');
    });

    test('calls onFocus when focused', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(handleFocus).toHaveBeenCalled();
    });

    test('calls onBlur when blurred', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      input.focus();
      input.blur();
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    test('shows error when value is empty and required', () => {
      render(<Input required error="Required" value="" />);
      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    test('validates email format', () => {
      render(<Input type="email" value="invalid" error="Invalid email" />);
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
  });
});
```

#### 3.1.3 Modal Component

**File:** `tests/unit/components/ui/Modal.test.tsx`

**Test Cases:**

```typescript
describe('Modal', () => {
  describe('rendering', () => {
    test('does not render when isOpen is false', () => {
      render(<Modal isOpen={false} onClose={() => {}}>Content</Modal>);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders when isOpen is true', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('renders with title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Modal Title">
          Content
        </Modal>
      );
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    test('renders with custom size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl');
    });
  });

  describe('interactions', () => {
    test('calls onClose when close button is clicked', () => {
      const handleClose = jest.fn();
      render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
      fireEvent.click(screen.getByLabelText('Close'));
      expect(handleClose).toHaveBeenCalled();
    });

    test('calls onClose when overlay is clicked', () => {
      const handleClose = jest.fn();
      render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
      fireEvent.click(screen.getByTestId('modal-overlay'));
      expect(handleClose).toHaveBeenCalled();
    });

    test('does not close when content is clicked', () => {
      const handleClose = jest.fn();
      render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
      fireEvent.click(screen.getByText('Content'));
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    test('closes on Escape key', () => {
      const handleClose = jest.fn();
      render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });

    test('traps focus within modal', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <button>First</button>
          <button>Second</button>
        </Modal>
      );
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      fireEvent.keyDown(buttons[0], { key: 'Tab' });
      expect(buttons[1]).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<Modal isOpen={true} onClose={() => {}} title="Title">Content</Modal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('manages focus on open', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveFocus();
    });

    test('returns focus on close', () => {
      const triggerButton = screen.getByRole('button');
      render(
        <>
          <button>Trigger</button>
          <Modal isOpen={true} onClose={() => {}}>Content</Modal>
        </>
      );
      // Simulate close
      expect(triggerButton).toHaveFocus();
    });
  });
});
```

#### 3.1.4 Spinner Component

**File:** `tests/unit/components/ui/Spinner.test.tsx`

**Test Cases:**

```typescript
describe('Spinner', () => {
  describe('rendering', () => {
    test('renders with default size', () => {
      render(<Spinner />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    test('renders with custom size', () => {
      render(<Spinner size="lg" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveClass('w-8 h-8');
    });

    test('renders with custom color', () => {
      render(<Spinner color="text-blue-600" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveClass('text-blue-600');
    });
  });

  describe('accessibility', () => {
    test('has aria-label for screen readers', () => {
      render(<Spinner aria-label="Loading content" />);
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });

    test('has role="status" by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
```

#### 3.1.5 Progress Component

**File:** `tests/unit/components/ui/Progress.test.tsx`

**Test Cases:**

```typescript
describe('Progress', () => {
  describe('rendering', () => {
    test('renders with value', () => {
      render(<Progress value={50} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('displays correct percentage', () => {
      render(<Progress value={75} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '75');
    });

    test('handles 0 value', () => {
      render(<Progress value={0} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });

    test('handles 100 value', () => {
      render(<Progress value={100} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('styling', () => {
    test('applies custom className', () => {
      render(<Progress value={50} className="custom-class" />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('custom-class');
    });

    test('shows different colors based on value', () => {
      const { rerender } = render(<Progress value={30} />);
      expect(screen.getByRole('progressbar')).toHaveClass('bg-red-500');

      rerender(<Progress value={60} />);
      expect(screen.getByRole('progressbar')).toHaveClass('bg-amber-500');

      rerender(<Progress value={90} />);
      expect(screen.getByRole('progressbar')).toHaveClass('bg-green-500');
    });
  });

  describe('accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuemin', '0');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
      expect(progress).toHaveAttribute('aria-valuenow', '50');
    });
  });
});
```

### 3.2 Evidence Components

#### 3.2.1 VerdictBadge Component

**File:** `tests/unit/components/evidence/VerdictBadge.test.tsx`

**Test Cases:**

```typescript
describe('VerdictBadge', () => {
  describe('rendering', () => {
    test('renders supported verdict with green styling', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    test('renders weak verdict with amber styling', () => {
      render(<VerdictBadge verdict="weak" />);
      const badge = screen.getByText('Weak');
      expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
    });

    test('renders contradicted verdict with red styling', () => {
      render(<VerdictBadge verdict="contradicted" />);
      const badge = screen.getByText('Contradicted');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    test('renders not_found verdict with gray styling', () => {
      render(<VerdictBadge verdict="not_found" />);
      const badge = screen.getByText('Not Found');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('sizes', () => {
    test('renders small size', () => {
      render(<VerdictBadge verdict="supported" size="sm" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
    });

    test('renders medium size by default', () => {
      render(<VerdictBadge verdict="supported" />);
      const badge = screen.getByText('Supported');
      expect(badge).toHaveClass('text-sm', 'px-3', 'py-1');
    });
  });

  describe('icons', () => {
    test('includes icon when showIcon is true', () => {
      render(<VerdictBadge verdict="supported" showIcon />);
      expect(screen.getByTestId('verdict-icon')).toBeInTheDocument();
    });

    test('does not include icon when showIcon is false', () => {
      render(<VerdictBadge verdict="supported" showIcon={false} />);
      expect(screen.queryByTestId('verdict-icon')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('has correct icon for each verdict', () => {
      const { rerender } = render(<VerdictBadge verdict="supported" showIcon />);
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();

      rerender(<VerdictBadge verdict="weak" showIcon />);
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();

      rerender(<VerdictBadge verdict="contradicted" showIcon />);
      expect(screen.getByTestId('x-circle')).toBeInTheDocument();

      rerender(<VerdictBadge verdict="not_found" showIcon />);
      expect(screen.getByTestId('help-circle')).toBeInTheDocument();
    });
  });
});
```

#### 3.2.2 LedgerTable Component

**File:** `tests/unit/components/evidence/LedgerTable.test.tsx`

**Test Cases:**

```typescript
describe('LedgerTable', () => {
  const mockEntries: LedgerEntry[] = [
    {
      id: '1',
      claim_text: 'Revenue increased by 15%',
      claim_type: 'numeric',
      importance: 'critical',
      verdict: 'supported',
      confidence: 0.95,
      chunk_ids: ['abc123'],
    },
    {
      id: '2',
      claim_text: 'Policy requires approval',
      claim_type: 'policy',
      importance: 'material',
      verdict: 'weak',
      confidence: 0.65,
      chunk_ids: ['def456'],
    },
    {
      id: '3',
      claim_text: 'No refunds available',
      claim_type: 'fact',
      importance: 'minor',
      verdict: 'contradicted',
      confidence: 0.88,
      chunk_ids: ['ghi789'],
    },
  ];

  describe('rendering', () => {
    test('renders table with all entries', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Revenue increased by 15%')).toBeInTheDocument();
      expect(screen.getByText('Policy requires approval')).toBeInTheDocument();
      expect(screen.getByText('No refunds available')).toBeInTheDocument();
    });

    test('renders table headers', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Claim')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Verdict')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });

    test('renders empty state when no entries', () => {
      render(<LedgerTable entries={[]} />);
      expect(screen.getByText('No claims found')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    test('sorts entries by verdict order', () => {
      render(<LedgerTable entries={mockEntries} />);
      const rows = screen.getAllByTestId('ledger-row');
      expect(rows[0]).toHaveTextContent('Revenue increased by 15%'); // supported
      expect(rows[1]).toHaveTextContent('Policy requires approval'); // weak
      expect(rows[2]).toHaveTextContent('No refunds available'); // contradicted
    });
  });

  describe('interactions', () => {
    test('calls onRowClick when row is clicked', () => {
      const handleRowClick = jest.fn();
      render(<LedgerTable entries={mockEntries} onRowClick={handleRowClick} />);
      fireEvent.click(screen.getByText('Revenue increased by 15%'));
      expect(handleRowClick).toHaveBeenCalledWith(mockEntries[0]);
    });

    test('highlights row when highlightedId matches', () => {
      render(<LedgerTable entries={mockEntries} highlightedId="1" />);
      const row = screen.getByText('Revenue increased by 15%').closest('tr');
      expect(row).toHaveClass('bg-blue-50');
    });
  });

  describe('subcomponents', () => {
    test('renders importance dots correctly', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByTitle('critical claim')).toHaveClass('bg-red-500');
      expect(screen.getByTitle('material claim')).toHaveClass('bg-amber-500');
      expect(screen.getByTitle('minor claim')).toHaveClass('bg-gray-400');
    });

    test('renders claim type badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Numeric')).toBeInTheDocument();
      expect(screen.getByText('Policy')).toBeInTheDocument();
      expect(screen.getByText('Fact')).toBeInTheDocument();
    });

    test('renders verdict badges', () => {
      render(<LedgerTable entries={mockEntries} />);
      expect(screen.getByText('Supported')).toBeInTheDocument();
      expect(screen.getByText('Weak')).toBeInTheDocument();
      expect(screen.getByText('Contradicted')).toBeInTheDocument();
    });

    test('renders confidence bars with correct colors', () => {
      render(<LedgerTable entries={mockEntries} />);
      const highConfidence = screen.getByText('95%');
      expect(highConfidence.closest('div')).toHaveClass('bg-green-500');

      const mediumConfidence = screen.getByText('65%');
      expect(mediumConfidence.closest('div')).toHaveClass('bg-amber-500');
    });
  });
});
```

### 3.3 Chat Components

#### 3.3.1 MessageBubble Component

**File:** `tests/unit/components/chat/MessageBubble.test.tsx`

**Test Cases:**

```typescript
describe('MessageBubble', () => {
  const mockUserMessage: Message = {
    id: '1',
    role: 'user',
    content: 'What is the policy?',
    timestamp: new Date('2026-01-03T10:00:00'),
  };

  const mockAssistantMessage: Message = {
    id: '2',
    role: 'assistant',
    content: 'The policy states that...',
    citations: [
      { index: 1, chunk_id: 'abc123', document_id: 'doc1' },
    ],
    timestamp: new Date('2026-01-03T10:00:01'),
  };

  describe('user messages', () => {
    test('renders user message with blue background', () => {
      render(<MessageBubble message={mockUserMessage} />);
      const bubble = screen.getByText('What is the policy?').closest('div');
      expect(bubble).toHaveClass('bg-blue-600', 'text-white');
    });

    test('aligns user message to right', () => {
      render(<MessageBubble message={mockUserMessage} />);
      const container = screen.getByText('What is the policy?').closest('div');
      expect(container.parentElement).toHaveClass('justify-end');
    });

    test('does not show avatar for user messages', () => {
      render(<MessageBubble message={mockUserMessage} />);
      expect(screen.queryByTestId('bot-avatar')).not.toBeInTheDocument();
    });
  });

  describe('assistant messages', () => {
    test('renders assistant message with white background', () => {
      render(<MessageBubble message={mockAssistantMessage} />);
      const bubble = screen.getByText('The policy states that...').closest('div');
      expect(bubble).toHaveClass('bg-white', 'border', 'border-gray-200');
    });

    test('aligns assistant message to left', () => {
      render(<MessageBubble message={mockAssistantMessage} />);
      const container = screen.getByText('The policy states that...').closest('div');
      expect(container.parentElement).toHaveClass('justify-start');
    });

    test('shows bot avatar for assistant messages', () => {
      render(<MessageBubble message={mockAssistantMessage} />);
      expect(screen.getByTestId('bot-avatar')).toBeInTheDocument();
      expect(screen.getByText('VerityDraft')).toBeInTheDocument();
    });
  });

  describe('citations', () => {
    test('renders citations in assistant messages', () => {
      render(<MessageBubble message={mockAssistantMessage} />);
      expect(screen.getByTestId('citation-anchor')).toBeInTheDocument();
    });

    test('calls onCitationClick when citation is clicked', () => {
      const handleCitationClick = jest.fn();
      render(
        <MessageBubble
          message={mockAssistantMessage}
          onCitationClick={handleCitationClick}
        />
      );
      fireEvent.click(screen.getByTestId('citation-anchor'));
      expect(handleCitationClick).toHaveBeenCalledWith('abc123');
    });
  });

  describe('streaming', () => {
    test('shows streaming indicator when isStreaming is true', () => {
      render(
        <MessageBubble
          message={mockAssistantMessage}
          isStreaming={true}
        />
      );
      expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
    });

    test('does not show streaming indicator when isStreaming is false', () => {
      render(
        <MessageBubble
          message={mockAssistantMessage}
          isStreaming={false}
        />
      );
      expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument();
    });
  });

  describe('timestamps', () => {
    test('displays formatted timestamp', () => {
      render(<MessageBubble message={mockUserMessage} />);
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });
});
```

#### 3.3.2 QueryInput Component

**File:** `tests/unit/components/chat/QueryInput.test.tsx`

**Test Cases:**

```typescript
describe('QueryInput', () => {
  describe('rendering', () => {
    test('renders textarea with placeholder', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByPlaceholderText('Ask a question about your documents...')).toBeInTheDocument();
    });

    test('renders send button', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    test('displays current value', () => {
      render(<QueryInput value="Test query" onChange={() => {}} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Test query');
    });
  });

  describe('interactions', () => {
    test('calls onChange when text is entered', () => {
      const handleChange = jest.fn();
      render(<QueryInput value="" onChange={handleChange} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      expect(handleChange).toHaveBeenCalledWith('Hello');
    });

    test('calls onSubmit when send button is clicked', () => {
      const handleSubmit = jest.fn();
      render(<QueryInput value="Test" onChange={() => {}} onSubmit={handleSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      expect(handleSubmit).toHaveBeenCalled();
    });

    test('submits on Enter key without Shift', () => {
      const handleSubmit = jest.fn();
      render(<QueryInput value="Test" onChange={() => {}} onSubmit={handleSubmit} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(handleSubmit).toHaveBeenCalled();
    });

    test('does not submit on Enter key with Shift', () => {
      const handleSubmit = jest.fn();
      render(<QueryInput value="Test" onChange={() => {}} onSubmit={handleSubmit} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('does not submit when value is empty', () => {
      const handleSubmit = jest.fn();
      render(<QueryInput value="" onChange={() => {}} onSubmit={handleSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('does not submit when value is only whitespace', () => {
      const handleSubmit = jest.fn();
      render(<QueryInput value="   " onChange={() => {}} onSubmit={handleSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    test('disables textarea when disabled is true', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('disables send button when disabled is true', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} disabled />);
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    test('disables send button when value is empty', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });
  });

  describe('auto-resize', () => {
    test('auto-resizes textarea based on content', () => {
      render(<QueryInput value="Short" onChange={() => {}} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox');
      const initialHeight = textarea.style.height;

      // Trigger resize by changing value
      fireEvent.change(textarea, { target: { value: 'A'.repeat(200) } });
      const newHeight = textarea.style.height;
      expect(newHeight).not.toBe(initialHeight);
    });

    test('caps maximum height at 200px', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'A'.repeat(1000) } });
      expect(textarea.style.height).toBe('200px');
    });
  });

  describe('accessibility', () => {
    test('has aria-label on textarea', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Query input');
    });
  });
});
```

### 3.4 Document Components

#### 3.4.1 DocumentUpload Component

**File:** `tests/unit/components/documents/DocumentUpload.test.tsx`

**Test Cases:**

```typescript
describe('DocumentUpload', () => {
  describe('rendering', () => {
    test('renders drop zone', () => {
      render(<DocumentUpload />);
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
    });

    test('renders file type restrictions', () => {
      render(<DocumentUpload />);
      expect(screen.getByText(/PDF or DOCX up to 50MB/i)).toBeInTheDocument();
    });

    test('renders hidden file input', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveAttribute('accept', '.pdf,.docx');
      expect(input).toHaveAttribute('multiple');
    });
  });

  describe('file selection', () => {
    test('adds files when selected via input', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    test('filters invalid file types', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
    });

    test('filters files over 50MB', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const largeFile = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });
      fireEvent.change(input, { target: { files: [largeFile] } });
      expect(screen.queryByText('large.pdf')).not.toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    test('shows active state when dragging over', () => {
      render(<DocumentUpload />);
      const dropZone = screen.getByText(/click to upload/i).closest('div');
      fireEvent.dragOver(dropZone!, { dataTransfer: { files: [] } });
      expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('removes active state when dragging leaves', () => {
      render(<DocumentUpload />);
      const dropZone = screen.getByText(/click to upload/i).closest('div');
      fireEvent.dragOver(dropZone!, { dataTransfer: { files: [] } });
      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('adds files when dropped', () => {
      render(<DocumentUpload />);
      const dropZone = screen.getByText(/click to upload/i).closest('div');
      const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      });
      expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
    });
  });

  describe('file list', () => {
    test('displays uploaded files with progress', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('removes file when delete button is clicked', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      const deleteButton = screen.getByLabelText(/remove/i);
      fireEvent.click(deleteButton);
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('upload process', () => {
    test('disables upload button when no pending files', () => {
      render(<DocumentUpload />);
      expect(screen.getByRole('button', { name: /upload files/i })).toBeDisabled();
    });

    test('shows progress during upload', async () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });

    test('shows processing state after upload', async () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });

    test('shows complete state when finished', async () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      await waitFor(() => {
        expect(screen.getByText(/complete/i)).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    test('clears all files when Clear All is clicked', () => {
      render(<DocumentUpload />);
      const input = screen.getByRole('textbox', { hidden: true });
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });
});
```

### 3.5 Utility Functions

#### 3.5.1 Citations Utility

**File:** `tests/unit/utils/citations.test.ts`

**Test Cases:**

```typescript
describe('citations utilities', () => {
  describe('generateCitationId', () => {
    test('generates citation ID with chunk ID and index', () => {
      const id = generateCitationId('abc123', 1);
      expect(id).toBe('cite-abc123-1');
    });

    test('handles different chunk IDs', () => {
      const id1 = generateCitationId('xyz789', 2);
      const id2 = generateCitationId('def456', 3);
      expect(id1).toBe('cite-xyz789-2');
      expect(id2).toBe('cite-def456-3');
    });
  });

  describe('parseCitationRef', () => {
    test('parses valid citation reference', () => {
      const result = parseCitationRef('cite-abc123-1');
      expect(result).toEqual({ chunkId: 'abc123', index: 1 });
    });

    test('returns null for invalid format', () => {
      expect(parseCitationRef('invalid')).toBeNull();
      expect(parseCitationRef('cite-abc')).toBeNull();
      expect(parseCitationRef('cite-123')).toBeNull();
    });

    test('handles chunk IDs with hyphens', () => {
      const result = parseCitationRef('cite-abc-def-123-1');
      expect(result).toEqual({ chunkId: 'abc-def-123', index: 1 });
    });
  });

  describe('getVerdictColor', () => {
    test('returns correct color for each verdict', () => {
      expect(getVerdictColor('supported')).toBe('bg-green-500');
      expect(getVerdictColor('weak')).toBe('bg-amber-500');
      expect(getVerdictColor('contradicted')).toBe('bg-red-500');
      expect(getVerdictColor('not_found')).toBe('bg-gray-400');
    });
  });

  describe('getVerdictLabel', () => {
    test('returns correct label for each verdict', () => {
      expect(getVerdictLabel('supported')).toBe('Supported');
      expect(getVerdictLabel('weak')).toBe('Weak');
      expect(getVerdictLabel('contradicted')).toBe('Contradicted');
      expect(getVerdictLabel('not_found')).toBe('Not Found');
    });
  });

  describe('highlightText', () => {
    test('highlights matching text', () => {
      const result = highlightText('Hello world', 'world');
      expect(result).toBe('Hello <mark class="bg-yellow-200">world</mark>');
    });

    test('highlights all occurrences', () => {
      const result = highlightText('test test test', 'test');
      expect(result).toContain('<mark class="bg-yellow-200">test</mark>');
    });

    test('is case insensitive', () => {
      const result = highlightText('Hello World', 'world');
      expect(result).toContain('<mark class="bg-yellow-200">World</mark>');
    });

    test('handles special regex characters', () => {
      const result = highlightText('Price: $100', '$100');
      expect(result).toContain('<mark class="bg-yellow-200">$100</mark>');
    });

    test('returns original text when query is empty', () => {
      const result = highlightText('Hello world', '');
      expect(result).toBe('Hello world');
    });
  });

  describe('sortCitationsByVerdict', () => {
    test('sorts citations by verdict order', () => {
      const citations: Citation[] = [
        { index: 1, chunk_id: 'a', document_id: 'doc1', verdict: 'not_found' },
        { index: 2, chunk_id: 'b', document_id: 'doc1', verdict: 'supported' },
        { index: 3, chunk_id: 'c', document_id: 'doc1', verdict: 'weak' },
        { index: 4, chunk_id: 'd', document_id: 'doc1', verdict: 'contradicted' },
      ];
      const sorted = sortCitationsByVerdict(citations);
      expect(sorted[0].verdict).toBe('supported');
      expect(sorted[1].verdict).toBe('weak');
      expect(sorted[2].verdict).toBe('contradicted');
      expect(sorted[3].verdict).toBe('not_found');
    });

    test('handles citations without verdict', () => {
      const citations: Citation[] = [
        { index: 1, chunk_id: 'a', document_id: 'doc1' },
        { index: 2, chunk_id: 'b', document_id: 'doc1', verdict: 'supported' },
      ];
      const sorted = sortCitationsByVerdict(citations);
      expect(sorted[0].verdict).toBe('supported');
      expect(sorted[1].verdict).toBe('not_found');
    });
  });

  describe('groupCitationsByDocument', () => {
    test('groups citations by document ID', () => {
      const citations: Citation[] = [
        { index: 1, chunk_id: 'a', document_id: 'doc1', verdict: 'supported' },
        { index: 2, chunk_id: 'b', document_id: 'doc2', verdict: 'supported' },
        { index: 3, chunk_id: 'c', document_id: 'doc1', verdict: 'weak' },
      ];
      const grouped = groupCitationsByDocument(citations);
      expect(grouped.get('doc1')).toHaveLength(2);
      expect(grouped.get('doc2')).toHaveLength(1);
    });

    test('handles empty array', () => {
      const grouped = groupCitationsByDocument([]);
      expect(grouped.size).toBe(0);
    });
  });
});
```

### 3.6 React Hooks

#### 3.6.1 useSessions Hook

**File:** `tests/unit/hooks/useSessions.test.ts`

**Test Cases:**

```typescript
describe('useSessions', () => {
  beforeEach(() => {
    // Clear React Query cache
    queryClient.clear();
  });

  describe('useSessions', () => {
    test('fetches sessions for workspace', async () => {
      const mockSessions = [
        { id: '1', query: 'Test query', mode: 'answer' },
        { id: '2', query: 'Another query', mode: 'draft' },
      ];

      api.getWorkspaceSessions = jest.fn().mockResolvedValue({ data: mockSessions });

      const { result } = renderHook(() => useSessions('workspace-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSessions);
      expect(api.getWorkspaceSessions).toHaveBeenCalledWith('workspace-1');
    });

    test('does not fetch when workspaceId is empty', () => {
      const { result } = renderHook(() => useSessions(''));
      expect(result.current.fetchStatus).toBe('idle');
    });

    test('caches data for 2 minutes', async () => {
      api.getWorkspaceSessions = jest.fn().mockResolvedValue({ data: [] });

      const { result, rerender } = renderHook(() => useSessions('workspace-1'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(api.getWorkspaceSessions).toHaveBeenCalledTimes(1);

      // Re-render should use cached data
      rerender();
      expect(api.getWorkspaceSessions).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSession', () => {
    test('fetches single session', async () => {
      const mockSession = {
        id: 'session-1',
        query: 'Test query',
        mode: 'answer',
        status: 'completed',
      };

      api.getSession = jest.fn().mockResolvedValue({ data: mockSession });

      const { result } = renderHook(() => useSession('session-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSession);
    });

    test('does not fetch when sessionId is empty', () => {
      const { result } = renderHook(() => useSession(''));
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useSessionMessages', () => {
    test('fetches messages for session', async () => {
      const mockMessages = [
        { id: '1', role: 'user', content: 'Question' },
        { id: '2', role: 'assistant', content: 'Answer' },
      ];

      api.getSessionMessages = jest.fn().mockResolvedValue({ data: mockMessages });

      const { result } = renderHook(() => useSessionMessages('session-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMessages);
    });
  });

  describe('useSessionLedger', () => {
    test('fetches ledger for session', async () => {
      const mockLedger = {
        session_id: 'session-1',
        summary: { total_claims: 5, supported: 4, weak: 1, contradicted: 0, not_found: 0 },
        entries: [],
        risk_flags: [],
      };

      api.getSessionLedger = jest.fn().mockResolvedValue({ data: mockLedger });

      const { result } = renderHook(() => useSessionLedger('session-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLedger);
    });

    test('caches data for 5 minutes', async () => {
      api.getSessionLedger = jest.fn().mockResolvedValue({ data: {} });

      const { result, rerender } = renderHook(() => useSessionLedger('session-1'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(api.getSessionLedger).toHaveBeenCalledTimes(1);

      // Re-render should use cached data
      rerender();
      expect(api.getSessionLedger).toHaveBeenCalledTimes(1);
    });
  });

  describe('useExportSession', () => {
    test('exports session to markdown', async () => {
      api.exportSession = jest.fn().mockResolvedValue({ data: 'markdown content' });

      const { result } = renderHook(() => useExportSession());

      await act(async () => {
        await result.current.mutateAsync({ sessionId: 'session-1', format: 'markdown' });
      });

      expect(api.exportSession).toHaveBeenCalledWith('session-1', 'markdown');
      expect(result.current.isSuccess).toBe(true);
    });

    test('invalidates session query on success', async () => {
      api.exportSession = jest.fn().mockResolvedValue({ data: 'content' });

      const { result } = renderHook(() => useExportSession());

      await act(async () => {
        await result.current.mutateAsync({ sessionId: 'session-1', format: 'pdf' });
      });

      // Verify cache invalidation
      expect(queryClient.getQueryCache().find({ queryKey: ['session', 'session-1'] }))
        .toBeUndefined();
    });
  });
});
```

---

## 4. Integration Tests

### 4.1 API Service Layer

**File:** `tests/integration/api/documents.test.ts`

**Test Cases:**

```typescript
describe('Documents API Integration', () => {
  let server: SetupServerApi;

  beforeAll(() => {
    server = setupServer(
      rest.post('/api/documents/upload', (req, res, ctx) => {
        return res(
          ctx.status(201),
          ctx.json({
            id: 'doc-1',
            filename: 'test.pdf',
            status: 'processing',
            chunk_count: 0,
          })
        );
      }),
      rest.get('/api/documents/:id', (req, res, ctx) => {
        return res(
          ctx.json({
            id: req.params.id,
            filename: 'test.pdf',
            status: 'ready',
            chunk_count: 10,
          })
        );
      }),
      rest.delete('/api/documents/:id', (req, res, ctx) => {
        return res(ctx.status(204));
      })
    );
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('uploadDocument', () => {
    test('uploads document successfully', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.uploadDocument(formData);

      expect(response.data.id).toBe('doc-1');
      expect(response.data.status).toBe('processing');
    });

    test('handles upload error', async () => {
      server.use(
        rest.post('/api/documents/upload', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ detail: 'Invalid file type' }));
        })
      );

      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const formData = new FormData();
      formData.append('file', file);

      await expect(api.uploadDocument(formData)).rejects.toThrow();
    });
  });

  describe('getDocument', () => {
    test('fetches document details', async () => {
      const response = await api.getDocument('doc-1');
      expect(response.data.id).toBe('doc-1');
      expect(response.data.status).toBe('ready');
    });
  });

  describe('deleteDocument', () => {
    test('deletes document successfully', async () => {
      await api.deleteDocument('doc-1');
      // No exception means success
    });
  });
});
```

### 4.2 WebSocket Connections

**File:** `tests/integration/websocket/connection.test.ts`

**Test Cases:**

```typescript
describe('WebSocket Integration', () => {
  let mockWs: WebSocket;

  beforeEach(() => {
    // Mock WebSocket
    mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as WebSocket;

    global.WebSocket = jest.fn(() => mockWs) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connection', () => {
    test('establishes connection with correct URL', () => {
      const wsService = new WebSocketService('ws://localhost:8080');
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
    });

    test('handles connection open', (done) => {
      const wsService = new WebSocketService('ws://localhost:8080');

      const openHandler = (mockWs.addEventListener as jest.Mock).mock.calls.find(
        ([event]) => event === 'open'
      )[1];

      openHandler({ type: 'open' });

      expect(wsService.isConnected).toBe(true);
      done();
    });

    test('handles connection close', (done) => {
      const wsService = new WebSocketService('ws://localhost:8080');

      const closeHandler = (mockWs.addEventListener as jest.Mock).mock.calls.find(
        ([event]) => event === 'close'
      )[1];

      closeHandler({ type: 'close', code: 1000 });

      expect(wsService.isConnected).toBe(false);
      done();
    });

    test('reconnects on connection loss', async () => {
      const wsService = new WebSocketService('ws://localhost:8080', {
        reconnect: true,
        reconnectInterval: 100,
      });

      const closeHandler = (mockWs.addEventListener as jest.Mock).mock.calls.find(
        ([event]) => event === 'close'
      )[1];

      closeHandler({ type: 'close', code: 1006 });

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(WebSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('message handling', () => {
    test('receives content_chunk messages', (done) => {
      const wsService = new WebSocketService('ws://localhost:8080');
      const onContentChunk = jest.fn();

      wsService.on('content_chunk', onContentChunk);

      const messageHandler = (mockWs.addEventListener as jest.Mock).mock.calls.find(
        ([event]) => event === 'message'
      )[1];

      messageHandler({
        data: JSON.stringify({
          type: 'content_chunk',
          payload: {
            session_id: 'session-1',
            delta: 'Hello',
          },
        }),
      });

      expect(onContentChunk).toHaveBeenCalledWith({
        session_id: 'session-1',
        delta: 'Hello',
      });
      done();
    });

    test('receives claim_verified messages', (done) => {
      const wsService = new WebSocketService('ws://localhost:8080');
      const onClaimVerified = jest.fn();

      wsService.on('claim_verified', onClaimVerified);

      const messageHandler = (mockWs.addEventListener as jest.Mock).mock.calls.find(
        ([event]) => event === 'message'
      )[1];

      messageHandler({
        data: JSON.stringify({
          type: 'claim_verified',
          payload: {
            claim: {
              id: 'claim-1',
              verdict: 'supported',
              confidence: 0.95,
            },
          },
        }),
      });

      expect(onClaimVerified).toHaveBeenCalled();
      done();
    });

    test('receives ledger_updated messages', (done) => {
      const wsService = new WebSocketService('ws://localhost:8080');
      const onLedgerUpdated = jest.fn();

      wsService.on('ledger_updated', onLedgerUpdated);

      const messageHandler = (mockWs.addEventListener as jest.Mock).mock.calls.find(
        ([event]) => event === 'message'
      )[1];

      messageHandler({
        data: JSON.stringify({
          type: 'ledger_updated',
          payload: {
            session_id: 'session-1',
            summary: { total_claims: 5 },
            entries: [],
          },
        }),
      });

      expect(onLedgerUpdated).toHaveBeenCalled();
      done();
    });
  });

  describe('sending messages', () => {
    test('sends query message', () => {
      const wsService = new WebSocketService('ws://localhost:8080');

      wsService.sendQuery('session-1', 'What is the policy?');

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'query',
          payload: {
            session_id: 'session-1',
            query: 'What is the policy?',
          },
        })
      );
    });
  });
});
```

### 4.3 Context Providers

**File:** `tests/integration/contexts/AuthContext.test.tsx`

**Test Cases:**

```typescript
describe('AuthContext Integration', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('authentication', () => {
    test('logs in user successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('logs out user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    test('handles login error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('invalid@example.com', 'wrong-password');
        })
      ).rejects.toThrow();

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('session persistence', () => {
    test('restores session from localStorage', () => {
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual({ id: 'user-1', email: 'test@example.com' });
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('clears session on logout', async () => {
      localStorage.setItem('auth_token', 'mock-token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
        result.current.logout();
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});
```

---

## 5. End-to-End Tests

### 5.1 Authentication Flow

**File:** `tests/e2e/auth-flow.spec.ts`

**Test Cases:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/signup');

    // Fill signup form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.fill('[name="confirmPassword"]', 'SecurePassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to workspaces
    await expect(page).toHaveURL('/workspaces');

    // Verify user is logged in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('user can log in', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to workspaces
    await expect(page).toHaveURL('/workspaces');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    // First log in
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces');

    // Click logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('redirects to login when accessing protected route', async ({ page }) => {
    await page.goto('/workspaces');

    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });
});
```

### 5.2 Document Upload Journey

**File:** `tests/e2e/document-upload.spec.ts`

**Test Cases:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Document Upload Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces');
  });

  test('user can upload a PDF document', async ({ page }) => {
    // Navigate to workspace
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/files/sample.pdf');

    // Verify upload started
    await expect(page.locator('text=Uploading')).toBeVisible();

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 10000 });

    // Verify ready state
    await expect(page.locator('text=Ready')).toBeVisible({ timeout: 60000 });

    // Verify document appears in list
    await expect(page.locator('text=sample.pdf')).toBeVisible();

    // Verify chunk count displayed
    await expect(page.locator('[data-testid="chunk-count"]')).toContainText(/\d+ chunks/);
  });

  test('user can upload multiple documents', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      './tests/fixtures/files/sample.pdf',
      './tests/fixtures/files/sample2.pdf',
    ]);

    // Verify both files appear
    await expect(page.locator('text=sample.pdf')).toBeVisible();
    await expect(page.locator('text=sample2.pdf')).toBeVisible();
  });

  test('user sees error for invalid file type', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Try to upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/files/invalid.exe');

    // Verify error message
    await expect(page.locator('text=Only PDF and DOCX files are supported')).toBeVisible();
  });

  test('user can delete a document', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Click delete button on document
    await page.hover('[data-testid="document-card"]');
    await page.click('[data-testid="delete-document"]');

    // Confirm deletion
    await expect(page.locator('text=Delete Document')).toBeVisible();
    await page.click('button:has-text("Delete")');

    // Verify document removed
    await expect(page.locator('[data-testid="document-card"]')).not.toBeVisible();
  });

  test('user can drag and drop documents', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Create a data transfer object
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['content'], 'dragged.pdf', { type: 'application/pdf' }));
      return dt;
    });

    // Simulate drag and drop
    const dropZone = page.locator('[data-testid="drop-zone"]');
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // Verify file appears
    await expect(page.locator('text=dragged.pdf')).toBeVisible();
  });
});
```

### 5.3 Q&A Flow with Citations

**File:** `tests/e2e/qa-flow.spec.ts`

**Test Cases:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Q&A Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in and navigate to workspace
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.click('text=Test Workspace');
    await page.click('text=Chat');
  });

  test('user can ask a question and receive a verified answer', async ({ page }) => {
    // Type question
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('What is the maximum loan-to-value ratio?');

    // Submit
    await page.click('button:has-text("Send")');

    // Verify loading state
    await expect(page.locator('text=Generating')).toBeVisible();

    // Wait for response
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Verify citations present
    await expect(page.locator('[data-testid="citation-anchor"]').first()).toBeVisible();

    // Verify Evidence Ledger visible
    await expect(page.locator('text=Evidence Ledger')).toBeVisible();

    // Verify at least one claim verified
    await expect(page.locator('[data-verdict]').first()).toBeVisible();
  });

  test('user can click citation to view source', async ({ page }) => {
    // Ask a question
    await page.locator('[placeholder*="Ask a question"]').fill('What are the requirements?');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Click first citation
    await page.click('[data-testid="citation-anchor"]:first-child');

    // Verify source popover appears
    await expect(page.locator('[data-testid="citation-popover"]')).toBeVisible();

    // Verify snippet shown
    await expect(page.locator('[data-testid="evidence-snippet"]')).toContainText(/.+/);

    // Click "View in document"
    await page.click('text=View in document');

    // Verify document viewer opens with highlight
    await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="highlighted-chunk"]')).toBeVisible();
  });

  test('user can review claim in Evidence Ledger', async ({ page }) => {
    // Ask a question
    await page.locator('[placeholder*="Ask a question"]').fill('Explain the policy details');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Click on a claim in the ledger
    await page.click('[data-testid="ledger-row"]:first-child');

    // Verify claim details expand
    await expect(page.locator('[data-testid="claim-details"]')).toBeVisible();

    // Verify evidence snippet shown
    await expect(page.locator('[data-testid="evidence-snippet"]')).toBeVisible();

    // Verify verdict badge displayed
    await expect(page.locator('[data-testid="verdict-badge"]')).toBeVisible();
  });

  test('streaming response displays progressively', async ({ page }) => {
    await page.locator('[placeholder*="Ask a question"]').fill('Give a detailed summary');
    await page.click('button:has-text("Send")');

    // Capture initial content length
    const initialContent = await page.locator('[data-testid="assistant-message"]').textContent();

    // Wait briefly
    await page.waitForTimeout(500);

    // Verify content has grown
    const laterContent = await page.locator('[data-testid="assistant-message"]').textContent();
    expect(laterContent?.length).toBeGreaterThan(initialContent?.length || 0);
  });

  test('user can filter claims by verdict', async ({ page }) => {
    // Generate a response
    await page.locator('[placeholder*="Ask a question"]').fill('Summarize the policy');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Filter by "supported"
    await page.click('text=Filter');
    await page.click('text=Supported');

    // Verify only supported claims shown
    const rows = page.locator('[data-testid="ledger-row"]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Supported');
    }
  });
});
```

### 5.4 Draft Generation Flow

**File:** `tests/e2e/draft-flow.spec.ts`

**Test Cases:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Draft Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in and navigate to workspace
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.click('text=Test Workspace');
    await page.click('text=Chat');
  });

  test('user can generate a draft with revision cycles', async ({ page }) => {
    // Switch to Draft mode
    await page.click('button:has-text("Draft")');
    await expect(page.locator('button:has-text("Draft")')).toHaveClass(/bg-blue-600/);

    // Enter draft prompt
    await page.locator('[placeholder*="Ask a question"]').fill(
      'Write an executive summary of the policy requirements'
    );
    await page.click('button:has-text("Send")');

    // Wait for draft generation
    await expect(page.locator('text=Generating draft')).toBeVisible();

    // Verify revision indicator appears if needed
    const revisionIndicator = page.locator('text=/Revision \\d of \\d/');
    await revisionIndicator.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});

    // Wait for completion
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 120000 });

    // Verify multiple citations
    const citations = page.locator('[data-testid="citation-anchor"]');
    await expect(citations).toHaveCount({ minimum: 3 });

    // Verify coverage displayed
    await expect(page.locator('[data-testid="coverage-score"]')).toBeVisible();

    // Verify coverage meets threshold
    const coverageText = await page.locator('[data-testid="coverage-score"]').textContent();
    const coverageValue = parseInt(coverageText?.replace('%', '') || '0');
    expect(coverageValue).toBeGreaterThanOrEqual(85);
  });

  test('user sees unsupported claims flagged', async ({ page }) => {
    await page.click('button:has-text("Draft")');

    // Request something likely to have unsupported claims
    await page.locator('[placeholder*="Ask a question"]').fill(
      'Predict the future market trends based on the data'
    );
    await page.click('button:has-text("Send")');

    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 120000 });

    // Look for "not found" or "weak" verdicts
    const unsupportedClaims = page.locator('[data-verdict="not_found"], [data-verdict="weak"]');
    const count = await unsupportedClaims.count();

    if (count > 0) {
      // Verify they're visually distinct
      await expect(unsupportedClaims.first()).toHaveClass(/bg-amber-|bg-gray-/);
    }
  });

  test('user can see risk flags for unsupported claims', async ({ page }) => {
    await page.click('button:has-text("Draft")');

    await page.locator('[placeholder*="Ask a question"]').fill(
      'Analyze the policy gaps'
    );
    await page.click('button:has-text("Send")');

    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 120000 });

    // Check for risk flags section
    const riskFlags = page.locator('[data-testid="risk-flags"]');
    if (await riskFlags.isVisible()) {
      await expect(riskFlags).toContainText('Risk Flags');
    }
  });
});
```

### 5.5 Session History and Export

**File:** `tests/e2e/session-history.spec.ts`

**Test Cases:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Session History', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('user can view past sessions', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');

    // Verify session list loads
    await expect(page.locator('[data-testid="session-card"]').first()).toBeVisible();

    // Verify session shows preview
    await expect(page.locator('[data-testid="session-preview"]').first()).toContainText(/.+/);

    // Verify timestamp shown
    await expect(page.locator('[data-testid="session-timestamp"]').first()).toBeVisible();
  });

  test('user can continue a previous session', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');

    // Click on a session
    await page.click('[data-testid="session-card"]:first-child');

    // Verify previous messages load
    await expect(page.locator('[data-testid="message"]')).toHaveCount({ minimum: 2 });

    // Add follow-up question
    await page.locator('[placeholder*="Ask a question"]').fill('Can you elaborate on that?');
    await page.click('button:has-text("Send")');

    // Verify new message appears
    await expect(page.locator('[data-testid="message"]')).toHaveCount({ minimum: 4 });
  });

  test('user can export a session to Markdown', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');
    await page.click('[data-testid="session-card"]:first-child');

    // Click export button
    await page.click('button:has-text("Export")');

    // Verify format options
    await expect(page.locator('text=Markdown')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=JSON')).toBeVisible();

    // Select Markdown
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Markdown'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('user can export a session to PDF', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');
    await page.click('[data-testid="session-card"]:first-child');

    // Click export button
    await page.click('button:has-text("Export")');

    // Select PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=PDF'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('user can export a session to JSON', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');
    await page.click('[data-testid="session-card"]:first-child');

    // Click export button
    await page.click('button:has-text("Export")');

    // Select JSON
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=JSON'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});
```

---

## 6. Test Fixtures and Mock Data

### 6.1 Mock Documents

**File:** `tests/fixtures/data/mock-documents.json`

```json
{
  "documents": [
    {
      "id": "doc-1",
      "workspace_id": "workspace-1",
      "filename": "policy-document.pdf",
      "file_type": "pdf",
      "status": "ready",
      "chunk_count": 25,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": "doc-2",
      "workspace_id": "workspace-1",
      "filename": "guidelines.docx",
      "file_type": "docx",
      "status": "ready",
      "chunk_count": 18,
      "created_at": "2026-01-02T00:00:00Z",
      "updated_at": "2026-01-02T00:00:00Z"
    }
  ],
  "chunks": [
    {
      "id": "chunk-1",
      "document_id": "doc-1",
      "content": "The maximum loan-to-value ratio is 80% for primary residences.",
      "page_number": 1,
      "heading_path": ["Loan Requirements"],
      "start_offset": 0,
      "end_offset": 72
    },
    {
      "id": "chunk-2",
      "document_id": "doc-1",
      "content": "All applications must be reviewed by the underwriting team.",
      "page_number": 2,
      "heading_path": ["Application Process"],
      "start_offset": 0,
      "end_offset": 65
    }
  ]
}
```

### 6.2 Mock Sessions

**File:** `tests/fixtures/data/mock-sessions.json`

```json
{
  "sessions": [
    {
      "id": "session-1",
      "workspace_id": "workspace-1",
      "query": "What is the maximum LTV ratio?",
      "mode": "answer",
      "status": "completed",
      "created_at": "2026-01-03T10:00:00Z",
      "updated_at": "2026-01-03T10:00:05Z"
    },
    {
      "id": "session-2",
      "workspace_id": "workspace-1",
      "query": "Write a summary of the policy",
      "mode": "draft",
      "status": "completed",
      "created_at": "2026-01-03T11:00:00Z",
      "updated_at": "2026-01-03T11:00:30Z"
    }
  ],
  "messages": [
    {
      "id": "msg-1",
      "session_id": "session-1",
      "role": "user",
      "content": "What is the maximum LTV ratio?",
      "timestamp": "2026-01-03T10:00:00Z"
    },
    {
      "id": "msg-2",
      "session_id": "session-1",
      "role": "assistant",
      "content": "The maximum loan-to-value ratio is 80% [cite:chunk-1].",
      "citations": [
        {
          "index": 1,
          "chunk_id": "chunk-1",
          "document_id": "doc-1",
          "verdict": "supported"
        }
      ],
      "timestamp": "2026-01-03T10:00:05Z"
    }
  ]
}
```

### 6.3 Mock Ledger

**File:** `tests/fixtures/data/mock-ledger.json`

```json
{
  "session_id": "session-1",
  "summary": {
    "total_claims": 5,
    "supported": 4,
    "weak": 1,
    "contradicted": 0,
    "not_found": 0
  },
  "entries": [
    {
      "id": "claim-1",
      "claim_text": "Maximum LTV is 80%",
      "claim_type": "numeric",
      "importance": "critical",
      "verdict": "supported",
      "confidence": 0.95,
      "evidence_snippet": "The maximum loan-to-value ratio is 80% for primary residences.",
      "chunk_ids": ["chunk-1"]
    },
    {
      "id": "claim-2",
      "claim_text": "Applications require underwriting review",
      "claim_type": "policy",
      "importance": "material",
      "verdict": "supported",
      "confidence": 0.88,
      "evidence_snippet": "All applications must be reviewed by the underwriting team.",
      "chunk_ids": ["chunk-2"]
    },
    {
      "id": "claim-3",
      "claim_text": "Process takes approximately 3-5 days",
      "claim_type": "numeric",
      "importance": "minor",
      "verdict": "weak",
      "confidence": 0.65,
      "evidence_snippet": "The review process typically takes a few business days.",
      "chunk_ids": ["chunk-3"]
    }
  ],
  "risk_flags": []
}
```

---

## 7. Test Utilities and Helpers

### 7.1 Test Utilities

**File:** `tests/helpers/test-utils.ts`

```typescript
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Create test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Custom render with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    queryClient?: QueryClient;
    route?: string;
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  }
) {
  const {
    queryClient = createTestQueryClient(),
    route = '/',
    renderOptions = {},
  } = options;

  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Wait for async operations
export async function waitForLoadingToFinish() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

// Mock user data
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
};

// Mock auth token
export const mockAuthToken = 'mock-jwt-token';

// Mock workspace data
export const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  owner_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Mock document data
export const mockDocument = {
  id: 'doc-1',
  workspace_id: 'workspace-1',
  filename: 'test.pdf',
  file_type: 'pdf' as const,
  status: 'ready' as const,
  chunk_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Mock message data
export const mockMessage = {
  id: 'msg-1',
  role: 'assistant' as const,
  content: 'Test response',
  timestamp: new Date(),
};

// Mock ledger entry
export const mockLedgerEntry = {
  id: 'claim-1',
  claim_text: 'Test claim',
  claim_type: 'fact' as const,
  importance: 'critical' as const,
  verdict: 'supported' as const,
  confidence: 0.95,
  evidence_snippet: 'Test evidence',
  chunk_ids: ['chunk-1'],
};
```

### 7.2 Setup File

**File:** `tests/setup.ts`

```typescript
import { beforeAll, afterEach, afterAll } from 'bun:test';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Global setup
beforeAll(() => {
  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
});
```

---

## 8. Configuration Files

### 8.1 Bun Configuration

**File:** `bunfig.toml`

```toml
[test]
preload = ["./tests/setup.ts"]
coverage = true
coverageThreshold = {
  statements = 80
  branches = 75
  functions = 80
  lines = 80
}
coverageDir = "./coverage"
coverageReporters = ["text", "html", "lcov"]
```

### 8.2 Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 8.3 Package.json Scripts

**File:** `package.json` (additions)

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "bunx playwright test",
    "test:e2e:ui": "bunx playwright test --ui",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "msw": "^2.0.0",
    "happy-dom": "^12.10.3"
  }
}
```

---

## 9. Running Tests

### 9.1 Unit Tests

```bash
# Run all unit tests
bun test tests/unit

# Run specific test file
bun test tests/unit/components/ui/Button.test.tsx

# Run with coverage
bun test --coverage tests/unit

# Run in watch mode
bun test --watch tests/unit

# Run matching pattern
bun test --filter "Button" tests/unit
```

### 9.2 Integration Tests

```bash
# Run all integration tests
bun test tests/integration

# Run specific integration test
bun test tests/integration/api/documents.test.ts

# Run with coverage
bun test --coverage tests/integration
```

### 9.3 E2E Tests

```bash
# Run all E2E tests
bunx playwright test

# Run specific test file
bunx playwright test tests/e2e/qa-flow.spec.ts

# Run with UI mode
bunx playwright test --ui

# Run headed (visible browser)
bunx playwright test --headed

# Run specific project
bunx playwright test --project=chromium

# Update snapshots
bunx playwright test --update-snapshots

# Show report
bunx playwright show-report
```

### 9.4 All Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# View coverage report
open coverage/index.html
```

---

## 10. Coverage Requirements

| Module | Minimum Coverage |
|--------|------------------|
| UI Components | 80% |
| Evidence Components | 85% |
| Chat Components | 80% |
| Document Components | 80% |
| Layout Components | 75% |
| Utility Functions | 90% |
| React Hooks | 85% |
| API Services | 85% |
| Overall | 80% |

---

## 11. Best Practices

### 11.1 Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the behavior
- Follow Arrange-Act-Assert pattern
- Keep tests focused and independent

### 11.2 Component Testing

- Test user behavior, not implementation details
- Use `getBy*` queries over `queryBy*` when possible
- Test accessibility (ARIA attributes, keyboard navigation)
- Mock external dependencies (API calls, contexts)

### 11.3 Hook Testing

- Use `renderHook` from `@testing-library/react`
- Test all hook return values and callbacks
- Test error states and loading states
- Test cache invalidation and refetching

### 11.4 E2E Testing

- Test critical user journeys
- Use data-testid attributes for stable selectors
- Wait for elements to be visible before interacting
- Test across multiple browsers and devices

### 11.5 Mocking

- Mock only what's necessary
- Keep mocks close to real behavior
- Use MSW for API mocking in integration tests
- Clear mocks between tests

---

## 12. CI/CD Integration

### 12.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/unit
      - run: bun test --coverage tests/unit

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install
      - run: bun run build
      - run: bun run test:e2e
```

---

## 13. Maintenance

### 13.1 Regular Tasks

- Update test dependencies regularly
- Review and update test coverage reports
- Refactor duplicate test code into utilities
- Update mock data to match API changes

### 13.2 Test Documentation

- Document complex test scenarios
- Add comments for non-obvious test logic
- Keep test files organized and readable
- Update this plan as new features are added

---

## Appendix: Test Checklist

### Before Writing Tests

- [ ] Understand the component/function being tested
- [ ] Identify happy path and edge cases
- [ ] Determine what needs to be mocked
- [ ] Plan test structure and organization

### When Writing Tests

- [ ] Use descriptive test names
- [ ] Follow Arrange-Act-Assert pattern
- [ ] Test user behavior, not implementation
- [ ] Include accessibility tests
- [ ] Test error states and loading states

### After Writing Tests

- [ ] Run tests and ensure they pass
- [ ] Check coverage meets requirements
- [ ] Review for flakiness
- [ ] Update documentation if needed

---

**End of Front-End Testing Plan**
