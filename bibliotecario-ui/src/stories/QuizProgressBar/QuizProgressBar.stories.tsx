import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import { QuizProgressBar } from '../../components/QuizProgressBar';

const meta: Meta<typeof QuizProgressBar> = {
  title: 'Atoms/QuizProgressBar',
  component: QuizProgressBar,
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof QuizProgressBar>;

export const DemoAnimado: Story = {
  render: () => {
    const total = 10;
    const [step, setStep] = useState(1);

    return (
      <Stack spacing={2} width={300}>
        <QuizProgressBar passo={step} total={total} />

        <Stack direction="row" spacing={1} justifyContent="center">
          <Button
            variant="outlined"
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="contained"
            disabled={step >= total}
            onClick={() => setStep((s) => Math.min(total, s + 1))}
          >
            Seguinte
          </Button>
        </Stack>
      </Stack>
    );
  },
};
