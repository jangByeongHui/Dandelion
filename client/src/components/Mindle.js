import React from 'react';
import { Marker, Circle } from 'react-native-maps';

const Mindle = ({ latitude, longitude, radius, src, title, description, onPress, overlap }) => {
  return (
    <>
      <Circle
        center={{ latitude: latitude, longitude: longitude }}
        radius={radius}
        strokeWidth={1}
        strokeColor={overlap ? '#ff1a7d' : '#1a66ff'}
        fillColor={overlap ? 'rgba(255,230,238,0.5)' : 'rgba(230,238,255,0.5)'}
      />
      <Marker
        coordinate={{ latitude: latitude - 0.0002, longitude: longitude }}
        title={title}
        description={description}
        onPress={onPress}
        image={src}
      >
        {/* width,height로 크기 지정 */}
      </Marker>
    </>
  );
};

export default Mindle;
