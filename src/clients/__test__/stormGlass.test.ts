import * as HTTPUtils from '@src/util/request';
import stormGlassNormalized3HousFixture from '@test/fixtures/stormglass_normalized_response_3_hours.json';
import stormGlassWeather3HoursFixture from '@test/fixtures/stormglass_weather_3_hours.json';
import { StormGlass } from '../stormGlass';

jest.mock('@src/util/request');

describe('StormGlass client', () => {
  const MockedRequestClass = HTTPUtils.Request as jest.Mocked<
    typeof HTTPUtils.Request
  >;

  const mockedRequest =
    new HTTPUtils.Request() as jest.Mocked<HTTPUtils.Request>;

  it('should return the normalize forecast from the StormGlass service', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    mockedRequest.get.mockResolvedValue({
      data: stormGlassWeather3HoursFixture,
    } as HTTPUtils.Response);

    const stormGlass = new StormGlass(mockedRequest);
    const response = await stormGlass.fetchPoint(lat, lng);

    expect(response).toEqual(stormGlassNormalized3HousFixture);
  });

  it('should exclude incomplete data points', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    const incompleteResponse = {
      hours: [
        {
          windDirection: {
            noaa: 300,
          },
          time: '2020-04-20T00:00:00+00:00',
        },
      ],
    };

    mockedRequest.get.mockResolvedValue({
      data: incompleteResponse,
    } as HTTPUtils.Response);

    const stormGlass = new StormGlass(mockedRequest);
    const response = await stormGlass.fetchPoint(lat, lng);

    expect(response).toEqual([]);
  });

  it('should get a generic error from StormGlass service when the request fail before reaching the service', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    mockedRequest.get.mockRejectedValue('Network Error');

    const stormGlass = new StormGlass(mockedRequest);

    await expect(stormGlass.fetchPoint(lat, lng)).rejects.toThrow(
      'Unexpected error when trying to communicate to StormGlass: "Network Error"',
    );
  });

  it('should get an StormGlassResponseError when the StormGlass service responds with error', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    class FakeAxiosError extends Error {
      constructor(public response: object) {
        super();
      }
    }

    mockedRequest.get.mockRejectedValue(
      new FakeAxiosError({
        status: 429,
        data: { errors: ['Rate Limit reached'] },
      }),
    );

    MockedRequestClass.isRequestError.mockReturnValue(true);
    MockedRequestClass.extractErrorData.mockReturnValue({
      status: 429,
      data: { errors: ['Rate Limit reached'] },
    });

    const stormGlass = new StormGlass(mockedRequest);

    await expect(stormGlass.fetchPoint(lat, lng)).rejects.toThrow(
      'Unexpected error when trying to communicate to StormGlass: Error: {"errors":["Rate Limit reached"]} Code: 429',
    );
  });
});
