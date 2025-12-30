import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { FigmaIntegrator } from './FigmaIntegrator.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('FigmaIntegrator', () => {
  let figmaIntegrator: FigmaIntegrator;
  const mockToken = 'test-figma-token';
  const mockFileId = 'test-file-id';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup axios.create mock
    const mockAxiosInstance = {
      get: vi.fn(),
      defaults: {
        headers: {},
      },
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = vi.fn().mockReturnValue(false);

    figmaIntegrator = new FigmaIntegrator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with optional credentials', () => {
      const integrator = new FigmaIntegrator(mockToken, mockFileId);
      expect(integrator).toBeInstanceOf(FigmaIntegrator);
      expect(integrator.getFileId()).toBe(mockFileId);
    });

    it('should create instance without credentials', () => {
      const integrator = new FigmaIntegrator();
      expect(integrator).toBeInstanceOf(FigmaIntegrator);
      expect(integrator.getFileId()).toBe('');
    });

    it('should configure axios with correct base URL and timeout', () => {
      new FigmaIntegrator(mockToken, mockFileId);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.figma.com/v1',
          timeout: 30000,
        })
      );
    });
  });

  describe('connect', () => {
    it('should throw error if token or file ID is missing', async () => {
      await expect(figmaIntegrator.connect()).rejects.toThrow(
        'Figma API token and file ID are required'
      );
    });

    it('should successfully connect with valid credentials', async () => {
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);

      expect(figmaIntegrator.isConnectedToFigma()).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/files/${mockFileId}`);
    });

    it('should throw error for invalid token (401)', async () => {
      const mockError = {
        response: {
          status: 401,
        },
        isAxiosError: true,
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockRejectedValue(mockError);
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      await expect(figmaIntegrator.connect(mockToken, mockFileId)).rejects.toThrow(
        'Invalid Figma API token'
      );
      expect(figmaIntegrator.isConnectedToFigma()).toBe(false);
    });

    it('should throw error for file not found (404)', async () => {
      const mockError = {
        response: {
          status: 404,
        },
        isAxiosError: true,
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockRejectedValue(mockError);
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      await expect(figmaIntegrator.connect(mockToken, mockFileId)).rejects.toThrow(
        'Figma file not found'
      );
      expect(figmaIntegrator.isConnectedToFigma()).toBe(false);
    });

    it('should update credentials when provided', async () => {
      const newToken = 'new-token';
      const newFileId = 'new-file-id';

      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(newToken, newFileId);

      expect(figmaIntegrator.getFileId()).toBe(newFileId);
      expect(mockAxiosInstance.defaults.headers['X-Figma-Token']).toBe(newToken);
    });
  });

  describe('fetchIconComponents', () => {
    beforeEach(async () => {
      // Setup connected state
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);
    });

    it('should throw error if not connected', async () => {
      const disconnectedIntegrator = new FigmaIntegrator();
      await expect(disconnectedIntegrator.fetchIconComponents()).rejects.toThrow(
        'Not connected to Figma API'
      );
    });

    it('should fetch and extract components from Figma file', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'Icon 1',
                    description: 'Test icon 1',
                  },
                  {
                    type: 'FRAME',
                    children: [
                      {
                        type: 'COMPONENT',
                        id: 'comp-2',
                        name: 'Icon 2',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockFileData);

      const components = await figmaIntegrator.fetchIconComponents();

      expect(components).toHaveLength(2);
      expect(components[0]).toEqual({
        id: 'comp-1',
        name: 'Icon 1',
        type: 'COMPONENT',
        description: 'Test icon 1',
      });
      expect(components[1]).toEqual({
        id: 'comp-2',
        name: 'Icon 2',
        type: 'COMPONENT',
        description: undefined,
      });
    });

    it('should return empty array if no components found', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'FRAME',
                    name: 'Not a component',
                  },
                ],
              },
            ],
          },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockFileData);

      const components = await figmaIntegrator.fetchIconComponents();

      expect(components).toHaveLength(0);
    });

    it('should throw error for invalid file structure', async () => {
      const mockFileData = {
        status: 200,
        data: {
          // Missing document
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockFileData);

      await expect(figmaIntegrator.fetchIconComponents()).rejects.toThrow(
        'Invalid Figma file structure'
      );
    });
  });

  describe('isConnectedToFigma', () => {
    it('should return false initially', () => {
      expect(figmaIntegrator.isConnectedToFigma()).toBe(false);
    });

    it('should return true after successful connection', async () => {
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);

      expect(figmaIntegrator.isConnectedToFigma()).toBe(true);
    });
  });

  describe('getFileId', () => {
    it('should return empty string initially', () => {
      expect(figmaIntegrator.getFileId()).toBe('');
    });

    it('should return file ID after connection', async () => {
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);

      expect(figmaIntegrator.getFileId()).toBe(mockFileId);
    });
  });

  describe('exportComponentAsSVG', () => {
    beforeEach(async () => {
      // Setup connected state
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);
    });

    it('should throw error if not connected', async () => {
      const disconnectedIntegrator = new FigmaIntegrator();
      await expect(
        disconnectedIntegrator.exportComponentAsSVG('comp-1')
      ).rejects.toThrow('Not connected to Figma API');
    });

    it('should throw error if component ID is missing', async () => {
      await expect(figmaIntegrator.exportComponentAsSVG('')).rejects.toThrow(
        'Component ID is required'
      );
    });

    it('should successfully export component as SVG', async () => {
      const componentId = 'comp-1';
      const svgUrl = 'https://figma.com/svg/test.svg';
      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // Mock the images API call
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            [componentId]: svgUrl,
          },
        },
      });

      // Mock the SVG download
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      const result = await figmaIntegrator.exportComponentAsSVG(componentId);

      expect(result).toBe(svgContent);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/images/${mockFileId}`,
        expect.objectContaining({
          params: {
            ids: componentId,
            format: 'svg',
          },
        })
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        svgUrl,
        expect.objectContaining({
          timeout: 30000,
          responseType: 'text',
        })
      );
    });

    it('should throw error if images API returns invalid response', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          // Missing images field
        },
      });

      await expect(
        figmaIntegrator.exportComponentAsSVG('comp-1')
      ).rejects.toThrow('Invalid response from Figma images API');
    });

    it('should throw error if no SVG URL returned for component', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            'other-comp': 'https://figma.com/svg/other.svg',
          },
        },
      });

      await expect(
        figmaIntegrator.exportComponentAsSVG('comp-1')
      ).rejects.toThrow('No SVG URL returned for component comp-1');
    });

    it('should throw error if SVG download fails', async () => {
      const componentId = 'comp-1';
      const svgUrl = 'https://figma.com/svg/test.svg';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            [componentId]: svgUrl,
          },
        },
      });

      mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        figmaIntegrator.exportComponentAsSVG(componentId)
      ).rejects.toThrow('Network error');
    });
  });

  describe('filterIconComponents', () => {
    it('should filter components with icon prefix', () => {
      const components = [
        { id: '1', name: 'icon-home', type: 'COMPONENT' },
        { id: '2', name: 'Icon-search', type: 'COMPONENT' },
        { id: '3', name: 'button-primary', type: 'COMPONENT' },
      ];

      const result = figmaIntegrator.filterIconComponents(components);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('icon-home');
      expect(result[1].name).toBe('Icon-search');
    });

    it('should filter components with icon in name', () => {
      const components = [
        { id: '1', name: 'home-icon', type: 'COMPONENT' },
        { id: '2', name: 'IconButton', type: 'COMPONENT' },
        { id: '3', name: 'button', type: 'COMPONENT' },
      ];

      const result = figmaIntegrator.filterIconComponents(components);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('home-icon');
      expect(result[1].name).toBe('IconButton');
    });

    it('should filter components with icon tag in description', () => {
      const components = [
        { id: '1', name: 'home', type: 'COMPONENT', description: 'This is an icon' },
        { id: '2', name: 'search', type: 'COMPONENT', description: 'Tagged with #icon' },
        { id: '3', name: 'button', type: 'COMPONENT', description: 'A button component' },
      ];

      const result = figmaIntegrator.filterIconComponents(components);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('home');
      expect(result[1].name).toBe('search');
    });

    it('should handle components without description', () => {
      const components = [
        { id: '1', name: 'icon-home', type: 'COMPONENT' },
        { id: '2', name: 'button', type: 'COMPONENT' },
      ];

      const result = figmaIntegrator.filterIconComponents(components);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('icon-home');
    });

    it('should return empty array if no icons found', () => {
      const components = [
        { id: '1', name: 'button', type: 'COMPONENT' },
        { id: '2', name: 'card', type: 'COMPONENT' },
      ];

      const result = figmaIntegrator.filterIconComponents(components);

      expect(result).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const components = [
        { id: '1', name: 'ICON-HOME', type: 'COMPONENT' },
        { id: '2', name: 'Icon_Search', type: 'COMPONENT' },
        { id: '3', name: 'HomeIcon', type: 'COMPONENT' },
      ];

      const result = figmaIntegrator.filterIconComponents(components);

      expect(result).toHaveLength(3);
    });
  });

  describe('fetchIconComponentsWithPagination', () => {
    beforeEach(async () => {
      // Setup connected state
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);
    });

    it('should throw error if not connected', async () => {
      const disconnectedIntegrator = new FigmaIntegrator();
      await expect(
        disconnectedIntegrator.fetchIconComponentsWithPagination()
      ).rejects.toThrow('Not connected to Figma API');
    });

    it('should fetch and filter icon components by default', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-2',
                    name: 'button',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-3',
                    name: 'icon-search',
                  },
                ],
              },
            ],
          },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockFileData);

      const result = await figmaIntegrator.fetchIconComponentsWithPagination();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('icon-home');
      expect(result[1].name).toBe('icon-search');
    });

    it('should return all components when filterIcons is false', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-2',
                    name: 'button',
                  },
                ],
              },
            ],
          },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockFileData);

      const result = await figmaIntegrator.fetchIconComponentsWithPagination(false);

      expect(result).toHaveLength(2);
    });
  });

  describe('exportMultipleComponentsAsSVG', () => {
    beforeEach(async () => {
      // Setup connected state
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);
    });

    it('should throw error if not connected', async () => {
      const disconnectedIntegrator = new FigmaIntegrator();
      await expect(
        disconnectedIntegrator.exportMultipleComponentsAsSVG(['comp-1'])
      ).rejects.toThrow('Not connected to Figma API');
    });

    it('should export multiple components successfully', async () => {
      const componentIds = ['comp-1', 'comp-2'];
      const svgContent1 = '<svg><path d="M0 0"/></svg>';
      const svgContent2 = '<svg><path d="M1 1"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // Mock the images API calls
      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-1': 'https://figma.com/svg/1.svg',
            },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-2': 'https://figma.com/svg/2.svg',
            },
          },
        });

      // Mock the SVG downloads
      mockedAxios.get = vi.fn()
        .mockResolvedValueOnce({ status: 200, data: svgContent1 })
        .mockResolvedValueOnce({ status: 200, data: svgContent2 });

      const result = await figmaIntegrator.exportMultipleComponentsAsSVG(
        componentIds,
        10 // Short delay for testing
      );

      expect(result.size).toBe(2);
      expect(result.get('comp-1')).toBe(svgContent1);
      expect(result.get('comp-2')).toBe(svgContent2);
    });

    it('should continue exporting even if one component fails', async () => {
      const componentIds = ['comp-1', 'comp-2', 'comp-3'];
      const svgContent1 = '<svg><path d="M0 0"/></svg>';
      const svgContent3 = '<svg><path d="M2 2"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // Mock the images API calls
      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-1': 'https://figma.com/svg/1.svg',
            },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {}, // No URL for comp-2
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-3': 'https://figma.com/svg/3.svg',
            },
          },
        });

      // Mock the SVG downloads
      mockedAxios.get = vi.fn()
        .mockResolvedValueOnce({ status: 200, data: svgContent1 })
        .mockResolvedValueOnce({ status: 200, data: svgContent3 });

      const result = await figmaIntegrator.exportMultipleComponentsAsSVG(
        componentIds,
        10 // Short delay for testing
      );

      expect(result.size).toBe(2);
      expect(result.get('comp-1')).toBe(svgContent1);
      expect(result.get('comp-2')).toBeUndefined();
      expect(result.get('comp-3')).toBe(svgContent3);
    });

    it('should handle empty component array', async () => {
      const result = await figmaIntegrator.exportMultipleComponentsAsSVG([]);

      expect(result.size).toBe(0);
    });
  });

  describe('syncIcon', () => {
    let mockIconSetManager: any;

    beforeEach(async () => {
      // Setup connected state
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);

      // Mock IconSetManager
      mockIconSetManager = {
        addIcon: vi.fn().mockResolvedValue(undefined),
      };
    });

    it('should throw error if not connected', async () => {
      const disconnectedIntegrator = new FigmaIntegrator();
      await expect(
        disconnectedIntegrator.syncIcon('comp-1', 'icon-home', mockIconSetManager)
      ).rejects.toThrow('Not connected to Figma API');
    });

    it('should successfully sync a single icon', async () => {
      const componentId = 'comp-1';
      const componentName = 'icon-home';
      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // Mock the images API call
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            [componentId]: 'https://figma.com/svg/test.svg',
          },
        },
      });

      // Mock the SVG download
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      await figmaIntegrator.syncIcon(componentId, componentName, mockIconSetManager);

      expect(mockIconSetManager.addIcon).toHaveBeenCalledWith(
        'gd',
        'home',
        svgContent,
        { conflictStrategy: 'overwrite' }
      );
    });

    it('should convert component name to valid icon name', async () => {
      const componentId = 'comp-1';
      const componentName = 'Icon-My Test Icon';
      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            [componentId]: 'https://figma.com/svg/test.svg',
          },
        },
      });

      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      await figmaIntegrator.syncIcon(componentId, componentName, mockIconSetManager);

      expect(mockIconSetManager.addIcon).toHaveBeenCalledWith(
        'gd',
        'my-test-icon',
        svgContent,
        { conflictStrategy: 'overwrite' }
      );
    });

    it('should use custom namespace if provided', async () => {
      const componentId = 'comp-1';
      const componentName = 'icon-home';
      const svgContent = '<svg><path d="M0 0"/></svg>';
      const customNamespace = 'custom';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            [componentId]: 'https://figma.com/svg/test.svg',
          },
        },
      });

      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      await figmaIntegrator.syncIcon(
        componentId,
        componentName,
        mockIconSetManager,
        customNamespace
      );

      expect(mockIconSetManager.addIcon).toHaveBeenCalledWith(
        customNamespace,
        'home',
        svgContent,
        { conflictStrategy: 'overwrite' }
      );
    });

    it('should generate fallback icon name if name is empty after processing', async () => {
      const componentId = 'comp-12345678';
      const componentName = 'icon-';
      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            [componentId]: 'https://figma.com/svg/test.svg',
          },
        },
      });

      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      await figmaIntegrator.syncIcon(componentId, componentName, mockIconSetManager);

      expect(mockIconSetManager.addIcon).toHaveBeenCalledWith(
        'gd',
        'icon-comp-123',
        svgContent,
        { conflictStrategy: 'overwrite' }
      );
    });

    it('should throw error if export fails', async () => {
      const componentId = 'comp-1';
      const componentName = 'icon-home';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockRejectedValueOnce(
        new Error('Export failed')
      );

      await expect(
        figmaIntegrator.syncIcon(componentId, componentName, mockIconSetManager)
      ).rejects.toThrow('Export failed');

      expect(mockIconSetManager.addIcon).not.toHaveBeenCalled();
    });
  });

  describe('syncAllIcons', () => {
    let mockIconSetManager: any;

    beforeEach(async () => {
      // Setup connected state
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test File',
          document: {},
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await figmaIntegrator.connect(mockToken, mockFileId);

      // Mock IconSetManager
      mockIconSetManager = {
        addIcon: vi.fn().mockResolvedValue(undefined),
        getAllIcons: vi.fn().mockResolvedValue({
          prefix: 'gd',
          icons: {},
        }),
      };
    });

    it('should throw error if not connected', async () => {
      const disconnectedIntegrator = new FigmaIntegrator();
      await expect(
        disconnectedIntegrator.syncAllIcons(mockIconSetManager)
      ).rejects.toThrow('Not connected to Figma API');
    });

    it('should return empty result if no icon components found', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'button',
                  },
                ],
              },
            ],
          },
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockFileData);

      const result = await figmaIntegrator.syncAllIcons(mockIconSetManager);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockIconSetManager.addIcon).not.toHaveBeenCalled();
    });

    it('should successfully sync all icon components', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-2',
                    name: 'icon-search',
                  },
                ],
              },
            ],
          },
        },
      };

      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // First call for fetchIconComponentsWithPagination
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockFileData);
      
      // Mock the images API calls for each component
      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-1': 'https://figma.com/svg/1.svg',
            },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-2': 'https://figma.com/svg/2.svg',
            },
          },
        });

      // Mock the SVG downloads
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      const result = await figmaIntegrator.syncAllIcons(mockIconSetManager);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockIconSetManager.addIcon).toHaveBeenCalledTimes(2);
    });

    it('should continue syncing even if one icon fails', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-2',
                    name: 'icon-search',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-3',
                    name: 'icon-menu',
                  },
                ],
              },
            ],
          },
        },
      };

      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // First call for fetchIconComponentsWithPagination
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockFileData);
      
      // Mock the images API calls
      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-1': 'https://figma.com/svg/1.svg',
            },
          },
        })
        .mockRejectedValueOnce(new Error('Export failed for comp-2'))
        .mockResolvedValueOnce({
          status: 200,
          data: {
            images: {
              'comp-3': 'https://figma.com/svg/3.svg',
            },
          },
        });

      // Mock the SVG downloads
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      const result = await figmaIntegrator.syncAllIcons(mockIconSetManager);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].componentId).toBe('comp-2');
      expect(mockIconSetManager.addIcon).toHaveBeenCalledTimes(2);
    });

    it('should support incremental sync by skipping existing icons', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                  {
                    type: 'COMPONENT',
                    id: 'comp-2',
                    name: 'icon-search',
                  },
                ],
              },
            ],
          },
        },
      };

      // Mock existing icons
      mockIconSetManager.getAllIcons.mockResolvedValue({
        prefix: 'gd',
        icons: {
          home: { body: '<path d="M0 0"/>' },
        },
      });

      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      // First call for fetchIconComponentsWithPagination
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockFileData);
      
      // Mock the images API call for comp-2 only
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            'comp-2': 'https://figma.com/svg/2.svg',
          },
        },
      });

      // Mock the SVG download
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      const result = await figmaIntegrator.syncAllIcons(
        mockIconSetManager,
        'gd',
        true // incremental
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      // Only one icon should be actually synced (comp-2), comp-1 was skipped
      expect(mockIconSetManager.addIcon).toHaveBeenCalledTimes(1);
      expect(mockIconSetManager.addIcon).toHaveBeenCalledWith(
        'gd',
        'search',
        svgContent,
        { conflictStrategy: 'overwrite' }
      );
    });

    it('should use custom namespace if provided', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                ],
              },
            ],
          },
        },
      };

      const svgContent = '<svg><path d="M0 0"/></svg>';
      const customNamespace = 'custom';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockFileData);
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            'comp-1': 'https://figma.com/svg/1.svg',
          },
        },
      });

      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      const result = await figmaIntegrator.syncAllIcons(
        mockIconSetManager,
        customNamespace
      );

      expect(result.success).toBe(1);
      expect(mockIconSetManager.addIcon).toHaveBeenCalledWith(
        customNamespace,
        'home',
        svgContent,
        { conflictStrategy: 'overwrite' }
      );
    });

    it('should handle getAllIcons failure in incremental mode gracefully', async () => {
      const mockFileData = {
        status: 200,
        data: {
          document: {
            type: 'DOCUMENT',
            children: [
              {
                type: 'CANVAS',
                children: [
                  {
                    type: 'COMPONENT',
                    id: 'comp-1',
                    name: 'icon-home',
                  },
                ],
              },
            ],
          },
        },
      };

      // Mock getAllIcons to fail
      mockIconSetManager.getAllIcons.mockRejectedValue(
        new Error('Failed to load icons')
      );

      const svgContent = '<svg><path d="M0 0"/></svg>';

      const mockAxiosInstance = mockedAxios.create();
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockFileData);
      
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({
        status: 200,
        data: {
          images: {
            'comp-1': 'https://figma.com/svg/1.svg',
          },
        },
      });

      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: svgContent,
      });

      // Should not throw, should fall back to full sync
      const result = await figmaIntegrator.syncAllIcons(
        mockIconSetManager,
        'gd',
        true // incremental
      );

      expect(result.success).toBe(1);
      expect(mockIconSetManager.addIcon).toHaveBeenCalledTimes(1);
    });
  });
});
