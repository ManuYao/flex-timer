import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '@/types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['timesport://', 'https://yourdomain.com'],
  config: {
    screens: {
      Home: 'home',
      AMRAP: {
        path: 'amrap/:initialDuration?/:initialWorkTime?/:initialRestTime?',
        parse: {
          initialDuration: Number,
          initialWorkTime: Number,
          initialRestTime: Number,
        },
      },
      'Basic Timer': {
        path: 'timer/:initialSeries?/:initialRestTime?',
        parse: {
          initialSeries: Number,
          initialRestTime: Number,
        },
      },
      EMOM: {
        path: 'emom/:initialRounds?/:initialIntervalTime?',
        parse: {
          initialRounds: Number,
          initialIntervalTime: Number,
        },
      },
      TABATA: {
        path: 'tabata/:initialRounds?/:initialWorkTime?/:initialRestTime?',
        parse: {
          initialRounds: Number,
          initialWorkTime: Number,
          initialRestTime: Number,
        },
      },
      MIX: {
        path: 'mix/:sequence?',
        parse: {
          sequence: (sequence: string) => {
            try {
              return JSON.parse(decodeURIComponent(sequence));
            } catch {
              return undefined;
            }
          },
        },
      },
    },
  },
};