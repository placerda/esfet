var SmoothedThroughputRule;

function SmoothedThroughputClass(config) {

  const factory = dashjs.FactoryMaker;
  const SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
  const MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
  const DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
  const Debug = factory.getSingletonFactoryByName('Debug');
  const PlaybackController = factory.getSingletonFactoryByName('PlaybackController');
  const context = this.context;
  const log = Debug(context).getInstance().log;
  const playbackController = PlaybackController(context).getInstance();

  function getMaxIndex(rulesContext) {

    // get available metrics
    const metricsModel = MetricsModel(context).getInstance();
    const dashMetrics = DashMetrics(context).getInstance();
    const mediaType = rulesContext.getMediaInfo().type; // audio or video
    const metrics = metricsModel.getReadOnlyMetricsFor(mediaType); // some additional metrics


    if (metrics.RequestsQueue) { // check if there's any finished request

      const bitrateList = rulesContext.getMediaInfo().bitrateList; // list bitrates
      const fragment = metrics.RequestsQueue.executedRequests[metrics.RequestsQueue.executedRequests.length-1]; // último fragmento transferido

      if (fragment.type == "MediaSegment"){ // verifica se é um framento de mídia

        const currentBitrate = bitrateList[fragment.quality].bandwidth;
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metrics) * 1000;


        //calculo buffer
        const safetyBufferLevel = 3 * (fragment.duration * 1000); // define o buffer mínimo para subir de nível
        //buffer mínimo para subir o nível (stableBufferTime) é definido em main.js: $scope.player.setStableBufferTime(20);
        const minimumBufferLevel = 1.5 * (fragment.duration * 1000); // define o buffer mínimo para reduzir nível

        let nextIndex = SwitchRequest.NO_CHANGE; //inicializa nextIndex (sem mudança)
        let reason = "";

        // calcula μ (MSD/SFT)
        const sft = fragment.requestEndDate.getTime() - fragment.requestStartDate.getTime();
        const msd = fragment.duration * 1000;
        const mi = msd/sft;

        const maxIndex = rulesContext.getMediaInfo().representationCount; //9

        // calcula 𝜀
        const epsilon = bitrateList.reduce(
            (max, bitrate, i, list)=>
              {
                const calc = ((i<maxIndex-1)?((list[i+1].bandwidth-list[i].bandwidth)/list[i].bandwidth):0)
                return ((calc>max)?calc:max)
              }
          ,0)

        // define 𝛾
        const gamma = 0.67

        // se μ  > (1 + 𝜀),  seleciona o proximo bitrate em nível acima do atual
        if ((mi > (1+epsilon)) && (bufferLevel > safetyBufferLevel)){
          if ((fragment.quality+1) < maxIndex){
            nextIndex = fragment.quality+1
            reason = "μ > (1 + 𝜀)"
          }
        }

        // senao se ( μ < 𝛾 ) ou ( comprimento do buffer < tamanho mínimo pré-calculado)
        // reduz a taxa para a primeira representação menor que μ * b𝑐
        if ((fragment.quality > 0) && ((mi < gamma) || (bufferLevel < minimumBufferLevel))){
          const refBitrate = (mi>=1?1:mi) * currentBitrate
          nextIndex = bitrateList.reduceRight(
              (max, bitrate, index)=>
                {
                  if ((bitrate.bandwidth < refBitrate) && (index > max)){
                    return index;
                  } else {
                    return max;
                  }
                }
            ,0)
          reason = ((mi < gamma)?"( μ < 𝛾 )":"buffer_low")
        }

        let sr = SwitchRequest(context).create(nextIndex, reason);

        //Define tempo ocioso t𝑠
        const minBitrate = bitrateList[0].bandwidth;
        let ts  = bufferLevel - minimumBufferLevel - ((currentBitrate/minBitrate) * msd);
        ts = (ts>0)?ts:0;
        const streamProcessor = rulesContext.getStreamProcessor();
        streamProcessor.getScheduleController().setTimeToLoadDelay(ts);

        //calcula througput
        const throughput = (fragment.bytesTotal*8)/(sft/1000);

        // console.log('%cmydashjs '+ extractFilename(fragment.url) + ' '+ (sr.reason),
        //   (sr.quality==-1)?'color:black;':(sr.quality>fragment.quality)?'color:green;':'color:red;',
        //   'throughput:', throughput.toFixed(0),
        //   'smoothed:', (mi*currentBitrate).toFixed(0),
        //   'ind:', fragment.quality+1,
        //   'next:', (nextIndex+1>0)?(nextIndex+1):"=",
        //   'buffer:', bufferLevel,
        //   //' msd:', msd,
        //   'sft:', sft,
        //   'mi:', mi.toFixed(2),
        //   'eps:', epsilon.toFixed(2),
        //   'ts:', ts.toFixed(2));

        log('smooth '+ extractFileExtension(fragment.url),
          (sr.quality==-1)?'\u25AC':(sr.quality>fragment.quality)?'\u25B2':'\u25BC',
          (sr.reason),
          //(numberWithCommas((throughput/1024/1024).toFixed(2)) + 'Mbps'),
          //(numberWithCommas((fragment.bytesTotal/1024).toFixed(0)) + 'KB'),
          ' cur:', fragment.quality+1,
          ' nex:', (nextIndex+1>0)?(nextIndex+1):"=",
          ' buf:', bufferLevel.toFixed(2),
          //' msd:', msd,
          ' sft:', sft,
          ' mi:', mi.toFixed(2),
          ' eps:', (epsilon === Number.MAX_SAFE_INTEGER)?"max":epsilon.toFixed(2),
          ' ts:', ts.toFixed(2)
          //' ti:', playbackController.getTime().toFixed(1)
        );

        const representation  = (nextIndex+1>0)?nextIndex+1:fragment.quality+1
        const bitrate = bitrateList[representation-1].bandwidth;
        let metricFields = {
          "representation": representation,
          "bitrate": bitrate
        }
        if (mediaType == "video")
          writeMetric(mediaType, metricFields);

        return sr;

      }
      return SwitchRequest(context).create(SwitchRequest.NO_CHANGE);
    } else {
      return SwitchRequest(context).create(SwitchRequest.NO_CHANGE);
    }

  }

  //utility functions
  function extractFileExtension(str){
      return str.substr(str.length-3, 3)
      //return str.split('/').pop().replace(/bbb_30fps_/i, "").replace(/bbb_a64k_/i, "");
  }


  // send metric to db
  function writeMetric(type, fields){
    var xhr = new XMLHttpRequest();
    //let random = Math.floor((Math.random() * 10) + 1);
    momento = Date.now() * 1000000 //convert nanoseconds (influxdb default's)
    const metrica = {"type": type, "fields": fields, "time": momento}
    xhr.open("POST", "/mydash/metrics", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(metrica));
  }

  function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const instance = {
      getMaxIndex: getMaxIndex
  };
  return instance;

}

SmoothedThroughputClass.__dashjs_factory_name = 'SmoothedThroughput';
SmoothedThroughputRule = dashjs.FactoryMaker.getClassFactory(SmoothedThroughputClass);
