export type VolumeSliderKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';
export type ToggleKey = 'screenShake' | 'fogOfWar' | 'minimap';

export interface SliderLayout {
  id: VolumeSliderKey;
  label: string;
  centerY: number;
  track: { x: number; y: number; width: number; height: number };
  knobRadius: number;
  labelX: number;
  valueX: number;
}

export interface ToggleLayout {
  id: ToggleKey;
  label: string;
  centerY: number;
  box: { x: number; y: number; width: number; height: number };
  labelX: number;
}

export interface SettingsLayout {
  panel: {
    x: number;
    y: number;
    width: number;
    height: number;
    paddingX: number;
    paddingTop: number;
  };
  sliders: SliderLayout[];
  toggles: ToggleLayout[];
  resetButton: { x: number; y: number; width: number; height: number };
  instructions: { lines: string[]; x: number; startY: number; lineGap: number };
}

const sliderDefs: Array<{ id: VolumeSliderKey; label: string }> = [
  { id: 'masterVolume', label: 'Master Volume' },
  { id: 'musicVolume', label: 'Music Volume' },
  { id: 'sfxVolume', label: 'SFX Volume' },
];

const toggleDefs: Array<{ id: ToggleKey; label: string }> = [
  { id: 'screenShake', label: 'Screen Shake' },
  { id: 'fogOfWar', label: 'Fog of War' },
  { id: 'minimap', label: 'Show Minimap' },
];

export function computeSettingsLayout(width: number, height: number): SettingsLayout {
  const panelWidth = Math.min(560, Math.max(420, width * 0.72));
  const panelX = (width - panelWidth) / 2;
  const panelY = Math.max(36, height * 0.12);
  const paddingX = 36;
  const paddingTop = 36;
  const paddingBottom = 40;

  const sliderLabelColumnWidth = 168;
  const percentColumnWidth = 70;
  const trackAvailable = panelWidth - paddingX * 2 - sliderLabelColumnWidth - percentColumnWidth;
  const sliderTrackWidth = Math.max(140, trackAvailable);
  const sliderTrackX = panelX + paddingX + sliderLabelColumnWidth;
  const sliderLabelX = panelX + paddingX;
  const sliderValueX = sliderTrackX + sliderTrackWidth + percentColumnWidth / 2;

  const sliderStartY = panelY + paddingTop + 64;
  const sliderSpacing = 56;
  const sliderTrackHeight = 10;
  const knobRadius = 11;

  const sliders: SliderLayout[] = sliderDefs.map((def, index) => {
    const centerY = sliderStartY + index * sliderSpacing;
    return {
      id: def.id,
      label: def.label,
      centerY,
      track: {
        x: sliderTrackX,
        y: centerY - sliderTrackHeight / 2,
        width: sliderTrackWidth,
        height: sliderTrackHeight,
      },
      knobRadius,
      labelX: sliderLabelX,
      valueX: sliderValueX,
    };
  });

  const toggleStartY = sliderStartY + sliders.length * sliderSpacing + 28;
  const toggleSpacing = 38;
  const toggleBoxSize = 22;
  const toggleBoxX = sliderLabelX;
  const toggleLabelX = toggleBoxX + toggleBoxSize + 14;

  const toggles: ToggleLayout[] = toggleDefs.map((def, index) => {
    const centerY = toggleStartY + index * toggleSpacing;
    return {
      id: def.id,
      label: def.label,
      centerY,
      box: {
        x: toggleBoxX,
        y: centerY - toggleBoxSize / 2,
        width: toggleBoxSize,
        height: toggleBoxSize,
      },
      labelX: toggleLabelX,
    };
  });

  const togglesBottom = toggles.length
    ? toggles[toggles.length - 1]!.centerY + toggleBoxSize / 2
    : sliderStartY + sliders.length * sliderSpacing;

  const resetButtonWidth = 190;
  const resetButtonHeight = 40;
  const resetButtonX = panelX + panelWidth - paddingX - resetButtonWidth;
  const resetButtonY = togglesBottom + 24;

  const instructionsLines = [
    'Click and drag sliders to mix the audio balance.',
    'Toggle presentation effects with the checkboxes.',
    'Press Esc to return or M to mute instantly.',
  ];

  const instructionsStartY = resetButtonY + resetButtonHeight + 28;
  const instructionsLineGap = 18;
  const instructionsHeight =
    instructionsLines.length > 0 ? (instructionsLines.length - 1) * instructionsLineGap : 0;

  const contentBottom = instructionsStartY + instructionsHeight;
  const panelHeight = contentBottom - panelY + paddingBottom;

  return {
    panel: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      paddingX,
      paddingTop,
    },
    sliders,
    toggles,
    resetButton: {
      x: resetButtonX,
      y: resetButtonY,
      width: resetButtonWidth,
      height: resetButtonHeight,
    },
    instructions: {
      lines: instructionsLines,
      x: panelX + paddingX,
      startY: instructionsStartY,
      lineGap: instructionsLineGap,
    },
  };
}
