import type { CodeBlock as CodeBlockData, PublicQuizBlock } from '@techcapsule/contracts';
import { screen, userEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { renderWithProviders } from '../../../test/utils';
import { BlockRenderer } from './BlockRenderer';
import { CodeBlock } from './CodeBlock';
import { QuizBlock } from './QuizBlock';

const quiz: PublicQuizBlock = {
  id: 'q1',
  type: 'quiz',
  question: 'What does MCP standardise?',
  options: [
    { id: 'a', text: 'How AI apps connect to tools and data' },
    { id: 'b', text: 'CSS layouts' },
  ],
  multiple: false,
};

describe('QuizBlock', () => {
  it('submits the selected option and shows the server verdict and explanation', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn(async () => ({
      blockId: 'q1',
      correct: false,
      correctOptionIds: ['a'],
      explanation: 'MCP is a protocol for tools, resources and prompts.',
    }));
    await renderWithProviders(<QuizBlock block={quiz} onSubmit={onSubmit} />);

    const submit = screen.getByTestId('quiz-submit-q1');
    expect(submit).toBeDisabled();

    await user.press(screen.getByTestId('quiz-option-b'));
    await user.press(submit);

    expect(onSubmit).toHaveBeenCalledWith(['b']);
    expect(await screen.findByText('Not quite')).toBeOnTheScreen();
    expect(
      screen.getByText('MCP is a protocol for tools, resources and prompts.'),
    ).toBeOnTheScreen();
  });

  it('surfaces API errors instead of pretending the answer was graded', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn(async () => {
      throw new Error('boom');
    });
    await renderWithProviders(<QuizBlock block={quiz} onSubmit={onSubmit} />);
    await user.press(screen.getByTestId('quiz-option-a'));
    await user.press(screen.getByTestId('quiz-submit-q1'));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeOnTheScreen();
    expect(screen.queryByTestId('quiz-result')).toBeNull();
  });
});

describe('CodeBlock', () => {
  const block: CodeBlockData = {
    id: 'c1',
    type: 'code',
    language: 'bash',
    code: 'docker compose up -d',
    filename: 'terminal',
  };

  it('copies the raw code to the clipboard', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<CodeBlock block={block} />);
    expect(screen.getByText('terminal')).toBeOnTheScreen();
    await user.press(screen.getByTestId('copy-c1'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('docker compose up -d');
    expect(await screen.findByText('Copied')).toBeOnTheScreen();
  });
});

describe('BlockRenderer', () => {
  it('renders paragraph markup as text, never as HTML', async () => {
    await renderWithProviders(
      <BlockRenderer
        block={{ id: 'p', type: 'paragraph', text: 'Hello <script>alert(1)</script> **world**' }}
        onQuizSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeOnTheScreen();
    expect(screen.getByText('world')).toBeOnTheScreen();
  });

  it('renders diagram nodes and labels connectors', async () => {
    await renderWithProviders(
      <BlockRenderer
        block={{
          id: 'd',
          type: 'diagram',
          direction: 'vertical',
          nodes: [
            { id: 'client', label: 'MCP Client', tone: 'primary' },
            { id: 'server', label: 'MCP Server', tone: 'secondary' },
          ],
          edges: [{ from: 'client', to: 'server', label: 'JSON-RPC' }],
        }}
        onQuizSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText('MCP Client')).toBeOnTheScreen();
    expect(screen.getByText('MCP Server')).toBeOnTheScreen();
    expect(screen.getByText('JSON-RPC')).toBeOnTheScreen();
  });
});
