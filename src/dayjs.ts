import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import hijri from 'dayjs-hijri';

dayjs.extend(utc);
dayjs.extend(timezone);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
dayjs.extend(hijri);

export default dayjs;
