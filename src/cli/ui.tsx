import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface AppProps {
  onCommand: (command: string) => void;
  onExit: () => void;
}

export default function App({ onCommand, onExit }: AppProps) {
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;

    setShowWelcome(false);

    // Handle commands
    if (value === '/exit' || value === '/quit') {
      onExit();
      return;
    }

    if (value.startsWith('/')) {
      onCommand(value);
    } else {
      // Regular task input
      onCommand(value);
    }

    setInput('');
  };

  return (
    <Box flexDirection="column">
      {showWelcome && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">ContextEngine v1.0.0</Text>
          <Text color="gray">AI-powered planning for your codebase</Text>
          <Text color="gray">Model: x-ai/grok-code-fast-1 (via OpenRouter)</Text>
          <Text> </Text>
          <Text color="gray">Commands: /export /help /exit</Text>
        </Box>
      )}

      {/* Input */}
      <Box>
        <Text color="cyan" bold>&gt; </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder='Describe what you want to build...'
        />
      </Box>
    </Box>
  );
}
