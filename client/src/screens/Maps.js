import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components/native';
import MapData from '@contexts/Maps/MapData';
import MapView, { PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { Button, ImageButton, Mindle } from '@components';
import { TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { profile, button } from '../assets/index';
import BottomSheet from 'reanimated-bottom-sheet';
import Animated from 'react-native-reanimated';
import CreateMindle from '@components/CreateMindle';
import MindlePreview from '@screens/MindlePreview';
import MindleInfo from '@screens/MindleInfo';
import mapCtrl from '@controller/mapCtrl';
import dandelionCtrl from '@controller/dandelionCtrl';
const Container = styled.View`
  flex: 1;
`;
const StyledText = styled.Text`
  font-size: 16px;
  font-weight: 600;
`;

const Maps = ({ navigation }) => {
  const bottomSheet = useRef();
  const fall = new Animated.Value(2);
  const [modalVisible, setModalVisible] = useState(false);
  const [researchMap, setResearchMap] = useState(false); //위치 변화시 현 위치에서 검색 버튼
  const [clickedMindleInfo, setClickedMindleInfo] = useState(MapData.clickedMindleInfo);

  //모바일 화면에서 최적으로 지도를 랜더하기 위한 mapWidth 설정
  const [mapWidth, setMapWidth] = useState('99%');

  //사용자와 서클이 겹침에 따라 버튼 구별
  const [btnToggle, setBtnToggle] = useState();

  //현재 사용자 위치
  const [location, setLocation] = useState(MapData.location);

  //지도에서 현재 기준으로 삼고 있는 위치
  const [currentMapCoord, setCurrentMapCoord] = useState(MapData.currentMapCoord);
  const [currentMindle, setCurrentMindle] = useState({});
  //지도에 표시하기 위한 민들레 값들을 저장하는 변수
  const [checkInitialRegion, setCheckInitalRegion] = useState(false); //지도 초기 위치로 설정 되었는지(처음부터 재검색 버튼을 뜨는 것을 방지하기 위함)
  //API 기준 좌표
  const [mindleBaseCoord, setMindleBaseCoord] = useState(MapData.currentMapCoord);

  //TODO : useMemo
  const [mindles, setMindles] = useState([]);
  const renderInner = () =>
    clickedMindleInfo && (
      <View style={{ height: '100%' }}>
        {clickedMindleInfo.overlap ? (
          <MindleInfo
            mindleKey={clickedMindleInfo.key}
            name={clickedMindleInfo.name}
            overlap={clickedMindleInfo.overlap}
            navigation={navigation}
            position={clickedMindleInfo.position}
          />
        ) : (
          <MindlePreview
            mindleKey={clickedMindleInfo.key}
            name={clickedMindleInfo.name}
            overlap={clickedMindleInfo.overlap}
            navigation={navigation}
          />
        )}
      </View>
    );
  //지도가 준비 될 경우 실행되는 함수
  const updateMapStyle = () => {
    setMapWidth('100%');
  };
  const renderHeader = () => {
    if (clickedMindleInfo)
      return (
        <>
          <View style={styles.header}>
            <View style={styles.panelHeader}>
              <View style={styles.panelHandle} />
            </View>
          </View>
          <View style={styles.panel}>
            <View style={{ display: 'flex', flexDirection: 'row', marginBottom: 15 }}>
              <View style={{ marginRight: 15 }}>
                <StyledText>{clickedMindleInfo.name}</StyledText>
              </View>
              <Text>made by {clickedMindleInfo.madeby}</Text>
            </View>
            <View style={{ display: 'flex', flexDirection: 'row', marginTop: 5, marginBottom: 5 }}>
              <View style={{ marginRight: 15 }}>
                <Text>누적 방문자 {clickedMindleInfo.visitCount}</Text>
              </View>
              <View style={{ marginLeft: 15 }}>
                <Text>실시간 {clickedMindleInfo.current}</Text>
              </View>
            </View>

            <View style={{ marginRight: 10 }}>
              <Text>{clickedMindleInfo.description}</Text>
            </View>
          </View>
        </>
      );
  };
  useEffect(() => {
    mapCtrl.getUserLocation(
      setLocation,
      currentMapCoord,
      setCurrentMapCoord,
      setBtnToggle,
      setCurrentMindle,
      setMindles,
    );
  }, []);

  const getClickedMindleInfo = (mindle) => {
    // console.log('mindle info');
    // console.log(mindle);
    setClickedMindleInfo({
      key: mindle.key,
      name: mindle.title,
      madeby: '창시자', //데이터 필요
      description: mindle.description || '민들레 설명 데이터 없음',
      visitCount: 18, //데이터 필요
      current: 1, //데이터 필요
      overlap: mindle.overlap,
      position: { latitude: mindle.latitude, longitude: mindle.longitude },
    });
    console.log(mindle);
  };

  return (
    <Container>
      <CreateMindle
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        position={location}
        setMindles={setMindles}
      />

      <BottomSheet
        ref={bottomSheet}
        snapPoints={[700, 140, 0]}
        initialSnap={2}
        callbackNode={fall}
        enabledGestureInteraction={true}
        renderHeader={renderHeader}
        renderContent={renderInner}
        enabledContentGestureInteraction={true}
        enabledContentTapInteraction={false}
        enabledInnerScrolling={true}
        onCloseEnd={() => {
          setClickedMindleInfo(null);
        }}
      />

      <Animated.View style={{ flex: 1, opacity: Animated.add(0.3, Animated.multiply(fall, 1.0)) }}>
        <MapView
          style={[styles.map, { width: mapWidth }]}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          showsMyLocationButton={true}
          region={currentMapCoord}
          maxZoomLevel={19}
          minZoomLevel={17}
          onMapReady={() => {
            updateMapStyle();
          }}
          onRegionChangeComplete={(currnet) => {
            // onRegionChange(currnet);
            mapCtrl.onRegionChange(
              currnet,
              mindleBaseCoord,
              checkInitialRegion,
              setCheckInitalRegion,
              setResearchMap,
              setCurrentMapCoord,
              setMindleBaseCoord,
            );
          }}
        >
          {mindles.map((props, index) => {
            if (props.visible === false) {
              console.log('무야호');
            } else {
              return (
                <Mindle
                  key={props.key}
                  latitude={props.latitude}
                  longitude={props.longitude}
                  title={props.title}
                  src={props.src}
                  radius={props.radius}
                  overlap={props.overlap}
                  onPress={() => {
                    getClickedMindleInfo(props);
                    bottomSheet.current.snapTo(1);
                  }}
                />
              );
            }
          })}
        </MapView>
        <View
          style={{
            position: 'absolute', //use absolute position to show button on top of the map
            top: '90%', //for center align
            alignSelf: 'center', //for align to right
          }}
        >
          {btnToggle ? (
            <Button
              title={'민들레 입장'}
              onPress={() => {
                //TODO : 민들레 입장
                getClickedMindleInfo(currentMindle);
                bottomSheet.current.snapTo(1);
              }}
              width="200px"
              height="60px"
              fontSize="25px"
              backgroundcolor="#431F0E"
            />
          ) : (
            <Button
              title={'민들레 심기'}
              onPress={() => {
                //TODO : 민들레 심기
                setModalVisible(true);
                console.log('현재 좌표값', 'latitude : ' + location.latitude + '\nlongitude : ' + location.longitude); //좌표값 확인을 위한 팝업
              }}
              width="200px"
              height="60px"
              fontSize="25px"
              backgroundcolor="#431F0E"
            />
          )}
        </View>
        <View
          style={{
            position: 'absolute',
            top: '90%',
            alignSelf: 'flex-start',
          }}
        >
          {/* 현재 ../asset/index.js에 있는 profile 이미지로 버튼 생성 rounded 값으로 둥근 형태 */}
          <ImageButton src={profile} onPress={() => navigation.navigate('Mypage')} rounded />
        </View>
        <View
          style={{
            position: 'absolute',
            top: '90%',
            alignSelf: 'flex-end',
          }}
        >
          {/* 현재 ../asset/index.js에 있는 button 이미지로 버튼 생성 rounded 값으로 둥근 형태*/}
          <ImageButton src={button} onPress={() => navigation.navigate('HotSpot')} rounded />
        </View>
        {researchMap && (
          <View
            style={{
              position: 'absolute',
              top: '5%',
              alignSelf: 'center',
            }}
          >
            <Button
              title="현 지도에서 검색"
              width="200px"
              height="50px"
              fontSize="20px"
              backgroundcolor="#431F0E"
              onPress={() => {
                setResearchMap(false);
                //getData(currentMapCoord, location);
                dandelionCtrl.CompData(currentMapCoord, location, setCurrentMindle, setBtnToggle, setMindles);
              }}
            />
          </View>
        )}
      </Animated.View>
    </Container>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  panel: {
    padding: 15,
    backgroundColor: '#ffffff',
  },

  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#333333',
    shadowOffset: { width: -1, height: -3 },
    shadowRadius: 2,
    shadowOpacity: 0.4,
    // elevation: 5,
    paddingTop: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  panelHeader: {
    alignItems: 'center',
  },
  panelHandle: {
    width: 40,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#00000040',
    marginBottom: 5,
  },
});
export default Maps;
