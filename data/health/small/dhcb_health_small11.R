getwd()


setwd("C:/Users/vishrti/Desktop/ML webinar")


library(openxlsx)


dhcb<-read.xlsx("DCHB_Village_Release_0600 v1.xlsx")

str(dhcb)

colnames(dhcb)

dhcb_health<-dhcb[,c(2:8,31:74)]

colnames(dhcb_health)

#inversing the distance columns

dhcb_health$Distance<-15- dhcb_health$Distance
dhcb_health$Distance.1<-15- dhcb_health$Distance.1
dhcb_health$Distance.2<-15- dhcb_health$Distance.2
dhcb_health$Distance.3<-15- dhcb_health$Distance.3
dhcb_health$Distance.4<-15- dhcb_health$Distance.4
dhcb_health$Distance.5<-15- dhcb_health$Distance.5
dhcb_health$Distance.6<-15- dhcb_health$Distance.6
dhcb_health$Distance.7<-15- dhcb_health$Distance.7
dhcb_health$Distance.8<-15- dhcb_health$Distance.8
dhcb_health$Distance.9<-15- dhcb_health$Distance.9
dhcb_health$Distance.10<-15- dhcb_health$Distance.10


dhcb_health_small<-dhcb_health[dhcb_health$Total.Population.of.Village<1000,]

dhcb_health_medium<-dhcb_health[dhcb_health$Total.Population.of.Village > 1000 & dhcb_health$Total.Male.Population.of.Village < 2500 ,]

dhcb_health_high<-dhcb_health[dhcb_health$Total.Population.of.Village>2500,]

head (dhcb_health$Distance)


dhcb_health_high[dhcb_health_high$Total.Population.of.Village<2500,]

dhcb_health_medium[dhcb_health_medium$Total.Population.of.Village > 2500,]


library(dplyr)

dhcb_health_medium1<-filter(dhcb_health_medium, Total.Population.of.Village >= 1000 & Total.Population.of.Village <= 2500)



dim(dhcb_health)
dim(dhcb_health_high)+
  dim(dhcb_health_medium1)+
  dim(dhcb_health_small)


dim(dhcb_health_small)

colnames(dhcb_health_small)

dhcb_health_small.Scaled <- scale(dhcb_health_small[,3:51])


head(dhcb_health_small.Scaled)

str(dhcb_health_small.Scaled)


sum(is.na(dhcb_health_small.Scaled))

colnames(dhcb_health_small.Scaled)

lapply()
#[42] "Mobile.Health.Clinic.(Numbers)"                                     
#[43] "Mobile.Health.Clinic.Doctors.Total.Strength.(Numbers)"              
#[44] "Mobile.Health.Clinic.Doctors.In.Position.(Numbers)"  
#[26] "Hospital.Allopathic.(Numbers)"                                      
#[27] "Hospital.Allopathic.Doctors.Total.Strength.(Numbers)"               
#[28] "Hospital.Allopathic.Doctors.In.Position.(Numbers)"    
#[6] "Community.Health.Centre.(Numbers)"                                  
#[7] "Total.Positions.(Doctors.&.Support)"                                
#[8] "Total.Required.Strength.(Doctors.&.Support)"         
dhcb_health_small.Scaled1<-dhcb_health_small.Scaled[,-c(6,7,8,26,27,28,42,43,44)]

wssplot <- function(data, nc=15, seed=3110){
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in 2:nc){
    set.seed(seed)
    wss[i] <- sum(kmeans(data, centers=i)$withinss)}
  plot(1:nc, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares")}

wssplot(dhcb_health_small.Scaled1, nc=5)

colnames(dhcb_health_small.Scaled1)

sum(is.na(dhcb_health_small.Scaled1))

kmeans.clus = kmeans(x=dhcb_health_small.Scaled1, centers = 4, nstart = 3)

dhcb_health_small$Clusters <- kmeans.clus$cluster


aggr = aggregate(dhcb_health_small[,-c(1,2,8,9,10,28,29,30,44,45,46)],list(dhcb_health_small$Clusters),mean)


colnames(dhcb_health_small)
write.csv(dhcb_health_small,file="dhcb_health_small.csv")

write.csv(aggr,file="dhcb_health_small1.csv")

getwd()
